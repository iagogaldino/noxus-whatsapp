import { IonIcon, IonInput, IonItem, IonLabel, IonList, IonPopover } from '@ionic/react';
import { chevronDownOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import {
  applyPhoneMask,
  buildInternationalPhone,
  detectCountryFromPhone,
  getCountryByCode,
  getNationalDigits,
  PHONE_COUNTRIES,
  type PhoneCountry,
} from '../utils/countries';
import { isValidWhatsAppPhone, normalizePhoneInput } from '../utils/phone';

interface PhoneInputProps {
  id?: string;
  value: string;
  onChange: (fullPhone: string) => void;
  placeholder?: string;
  className?: string;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  id,
  value,
  onChange,
  placeholder,
  className,
}) => {
  const detectedCountry = useMemo(() => detectCountryFromPhone(value), [value]);
  const [countryCode, setCountryCode] = useState(detectedCountry.code);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverEvent, setPopoverEvent] = useState<Event | undefined>();

  useEffect(() => {
    setCountryCode(detectedCountry.code);
  }, [detectedCountry.code]);

  const country = getCountryByCode(countryCode);
  const nationalDigits = getNationalDigits(value, country);
  const displayValue = applyPhoneMask(nationalDigits, country.mask);

  const updatePhone = (nextCountry: PhoneCountry, nextNationalDigits: string) => {
    const trimmed = nextNationalDigits.slice(0, nextCountry.nationalLength);
    onChange(buildInternationalPhone(nextCountry, trimmed));
  };

  const handleCountryChange = (nextCountryCode: string) => {
    const nextCountry = getCountryByCode(nextCountryCode);
    setCountryCode(nextCountryCode);
    updatePhone(nextCountry, nationalDigits);
    setPopoverOpen(false);
  };

  const handleInput = (rawValue: string) => {
    const digits = normalizePhoneInput(rawValue).slice(0, country.nationalLength);
    updatePhone(country, digits);
  };

  return (
    <div className={`phone-input ${className ?? ''}`}>
      <button
        type="button"
        className="phone-input__country"
        aria-label="Selecionar país"
        onClick={(event) => {
          setPopoverEvent(event.nativeEvent);
          setPopoverOpen(true);
        }}
      >
        <span className="phone-input__flag" aria-hidden="true">
          {country.flag}
        </span>
        <span className="phone-input__dial">+{country.dialCode}</span>
        <IonIcon icon={chevronDownOutline} className="phone-input__chevron" />
      </button>

      <div className="phone-input__field">
        <IonInput
          id={id}
          type="tel"
          inputmode="tel"
          placeholder={placeholder ?? country.mask.replace(/0/g, '9')}
          value={displayValue}
          onIonInput={(e) => handleInput(e.detail.value ?? '')}
        />
      </div>

      <IonPopover
        isOpen={popoverOpen}
        event={popoverEvent}
        onDidDismiss={() => setPopoverOpen(false)}
        className="phone-input__popover"
      >
        <IonList lines="full">
          {PHONE_COUNTRIES.map((item) => (
            <IonItem
              key={item.code}
              button
              detail={false}
              className={item.code === country.code ? 'phone-input__country-option--active' : ''}
              onClick={() => handleCountryChange(item.code)}
            >
              <span className="phone-input__flag" slot="start">
                {item.flag}
              </span>
              <IonLabel>
                <h3>{item.name}</h3>
                <p>+{item.dialCode}</p>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonPopover>
    </div>
  );
};

export default PhoneInput;

export function isPhoneInputValid(fullPhone: string): boolean {
  return isValidWhatsAppPhone(normalizePhoneInput(fullPhone));
}
