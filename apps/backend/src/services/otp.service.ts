import bcrypt from 'bcryptjs';
import { OtpChallenge } from '../models/OtpChallenge.js';
import { User } from '../models/User.js';
import { AppError } from '../middleware/error.middleware.js';
import * as saasWhatsApp from './saas-whatsapp.service.js';
import { isValidPhone, normalizePhone } from '../utils/phone.js';

const OTP_EXPIRES_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function generateOtpCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function requestOtp(rawPhone: string): Promise<{ expiresInSeconds: number }> {
  const phone = normalizePhone(rawPhone);

  if (!isValidPhone(phone)) {
    throw new AppError(400, 'Informe um telefone válido com DDD.');
  }

  const user = await User.findOne({ phone }).lean();
  if (!user) {
    throw new AppError(403, 'Telefone não cadastrado. Contate o administrador.');
  }

  if (user.status === 'inactive') {
    throw new AppError(403, 'Conta inativa. Contate o administrador.');
  }

  const existing = await OtpChallenge.findOne({ phone }).select('+codeHash lastSentAt').lean();
  if (existing?.lastSentAt) {
    const elapsed = Date.now() - existing.lastSentAt.getTime();
    if (elapsed < OTP_RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
      throw new AppError(429, `Aguarde ${waitSeconds}s para reenviar o código.`);
    }
  }

  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, 10);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_EXPIRES_MS);

  console.log(`[OTP] Código enviado para ${phone}: ${code}`);

  await OtpChallenge.findOneAndUpdate(
    { phone },
    {
      phone,
      codeHash,
      expiresAt,
      attempts: 0,
      lastSentAt: now,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const instanceId = await saasWhatsApp.resolveInstanceId();
  const message = `Seu código Noxus WhatsApp: ${code}. Válido por 5 minutos.`;

  try {
    await saasWhatsApp.sendMessage(instanceId, phone, message);
  } catch (err) {
    await OtpChallenge.deleteOne({ phone });
    if (err instanceof AppError) {
      if (err.statusCode === 503 || err.message.toLowerCase().includes('conectad')) {
        throw new AppError(503, 'WhatsApp desconectado. Peça ao administrador para conectar a instância.');
      }
      throw err;
    }
    throw new AppError(502, 'Não foi possível enviar o código pelo WhatsApp.');
  }

  return { expiresInSeconds: OTP_EXPIRES_MS / 1000 };
}

export async function verifyOtp(rawPhone: string, code: string): Promise<{ phone: string }> {
  const phone = normalizePhone(rawPhone);
  const normalizedCode = code.replace(/\D/g, '');

  if (!isValidPhone(phone)) {
    throw new AppError(400, 'Informe um telefone válido com DDD.');
  }

  if (normalizedCode.length !== 4) {
    throw new AppError(400, 'Informe o código de 4 dígitos.');
  }

  const challenge = await OtpChallenge.findOne({ phone }).select('+codeHash');
  if (!challenge) {
    throw new AppError(400, 'Código expirado ou não solicitado. Peça um novo código.');
  }

  if (challenge.expiresAt.getTime() < Date.now()) {
    await OtpChallenge.deleteOne({ phone });
    throw new AppError(400, 'Código expirado. Peça um novo código.');
  }

  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    await OtpChallenge.deleteOne({ phone });
    throw new AppError(429, 'Muitas tentativas. Solicite um novo código.');
  }

  const isValid = await bcrypt.compare(normalizedCode, challenge.codeHash);
  if (!isValid) {
    challenge.attempts += 1;
    await challenge.save();
    throw new AppError(401, 'Código inválido.');
  }

  await OtpChallenge.deleteOne({ phone });
  return { phone };
}
