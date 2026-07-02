import { Conversation, Message, User } from '../types/chat';

export const currentUser: User = {
  id: 'me',
  name: 'Você',
  avatarColor: '#128C7E',
  status: 'Disponível',
};

const participants: User[] = [
  { id: '1', name: 'Ana Silva', avatarColor: '#e17076', status: 'online' },
  { id: '2', name: 'Carlos Mendes', avatarColor: '#7bc862', status: 'online' },
  { id: '3', name: 'Equipe Projeto', avatarColor: '#65aadd', status: '3 participantes' },
  { id: '4', name: 'Maria Oliveira', avatarColor: '#a695e7', status: 'visto por último hoje às 14:32' },
  { id: '5', name: 'João Santos', avatarColor: '#ee7aae', status: 'online' },
  { id: '6', name: 'Família', avatarColor: '#6bcbef', status: '5 participantes' },
  { id: '7', name: 'Pedro Costa', avatarColor: '#faa74a', status: 'visto por último ontem' },
  { id: '8', name: 'Lucas Ferreira', avatarColor: '#86c3d8', status: 'online' },
  { id: '9', name: 'Juliana Rocha', avatarColor: '#d4a5a5', status: 'digitando...' },
  { id: '10', name: 'Rafael Lima', avatarColor: '#92a58c', status: 'visto por último hoje às 09:15' },
];

function createMessages(chatId: string, participantId: string, texts: string[]): Message[] {
  const now = Date.now();
  return texts.map((text, index) => {
    const isSent = index % 2 === 0;
    return {
      id: `${chatId}-msg-${index}`,
      chatId,
      text,
      senderId: isSent ? currentUser.id : participantId,
      timestamp: new Date(now - (texts.length - index) * 120000),
      status: isSent ? (index === texts.length - 1 ? 'read' : 'delivered') : undefined,
    };
  });
}

const messageTexts: Record<string, string[]> = {
  '1': [
    'Oi! Tudo bem?',
    'Tudo ótimo! E você?',
    'Também! Você viu o documento que enviei?',
    'Vi sim, ficou muito bom 👍',
    'Que bom! Podemos revisar amanhã?',
    'Claro, às 10h funciona?',
    'Perfeito, combinado!',
    'Até amanhã então 😊',
  ],
  '2': [
    'Cara, o deploy deu certo!',
    'Sério? Que alívio!',
    'Sim, tudo rodando em produção',
    'Manda o link pra eu conferir',
    'https://app.noxus.dev',
    'Testado e aprovado ✅',
  ],
  '3': [
    'Pessoal, reunião às 15h',
    'Confirmado!',
    'Vou preparar a apresentação',
    'Ótimo, obrigado Carlos',
    'Alguém pode compartilhar a ata?',
    'Eu mando depois da reunião',
    'Combinado',
    'Lembrem de atualizar o board',
    'Já atualizei as tasks',
    'Show! Nos vemos às 15h',
  ],
  '4': [
    'Bom dia Maria!',
    'Bom dia! Como vai?',
    'Bem! Preciso de uma ajuda com o relatório',
    'Claro, me manda o que você tem',
    'Enviei agora',
    'Recebi, vou dar uma olhada',
    'Obrigado! 🙏',
  ],
  '5': [
    'Fala João!',
    'E aí! Bora almoçar?',
    'Bora! Onde?',
    'Aquele restaurante novo no centro',
    'Top, te encontro lá 12h30',
    'Fechado 👊',
  ],
  '6': [
    'Jantar domingo na vovó!',
    'Eu levo a sobremesa',
    'Eu levo o suco',
    'Alguém busca a vovó?',
    'Eu busco!',
    'Perfeito, até domingo ❤️',
  ],
  '7': [
    'Pedro, você tem o contato do fornecedor?',
    'Tenho sim, vou te passar',
    'Obrigado!',
    '11 99999-8888 - fala com Ricardo',
    'Valeu demais!',
  ],
  '8': [
    'Lucas, viu o jogo ontem?',
    'Vi! Que partida!',
    'Inacreditável aquele gol no final',
    'Po, quase infartei 😂',
    'Hahaha mesma coisa aqui',
    'Próximo jogo é sábado',
    'Bora assistir juntos?',
    'Bora! Chama o pessoal',
  ],
  '9': [
    'Ju, o material chegou?',
    'Chegou sim!',
    'Ótimo, pode começar a montagem',
    'Já comecei, fica pronto até sexta',
    'Maravilha, obrigado!',
  ],
  '10': [
    'Rafael, tudo certo com o pagamento?',
    'Sim, processado hoje de manhã',
    'Recebi a confirmação aqui',
    'Excelente, obrigado pelo retorno',
  ],
};

export const initialMessages: Record<string, Message[]> = Object.fromEntries(
  Object.entries(messageTexts).map(([chatId, texts]) => [
    chatId,
    createMessages(chatId, chatId, texts),
  ]),
);

export const initialConversations: Conversation[] = participants.map((participant, index) => {
  const messages = initialMessages[participant.id];
  const lastMessage = messages[messages.length - 1];
  return {
    id: participant.id,
    participant,
    lastMessage,
    unreadCount: index < 3 ? [2, 1, 5][index] : 0,
  };
});
