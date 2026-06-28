import { describe, it, expect } from 'vitest';
import { maskSensitiveData, hasExternalChannel } from '../utils/masking';

describe('masking utilities', () => {
  describe('maskSensitiveData', () => {
    it('masks algerian phone numbers', () => {
      expect(maskSensitiveData('Mon numéro est 0612345678')).toBe('Mon numéro est [Numéro masqué]');
      expect(maskSensitiveData('Contactez +213712345678')).toBe('Contactez [Numéro masqué]');
      expect(maskSensitiveData('Call 05 12 34 56 78')).toBe('Call [Numéro masqué]');
    });

    it('masks social media mentions', () => {
      expect(maskSensitiveData('Contactez-moi sur whatsapp')).toBe('Contactez-moi sur [Réseau masqué]');
      expect(maskSensitiveData('Mon FB est test')).toBe('Mon [Réseau masqué] est test');
      expect(maskSensitiveData('Suivez mon instagram')).toBe('Suivez mon [Réseau masqué]');
    });

    it('masks emails', () => {
      expect(maskSensitiveData('Mon email est test@example.com')).toBe('Mon email est [Email masqué]');
    });

    it('masks payment info', () => {
      expect(maskSensitiveData('Mon CCP est 1234')).toBe('Mon [Paiement masqué] est 1234');
      expect(maskSensitiveData('Paiement par BaridiMob')).toBe('Paiement par [Paiement masqué]');
    });
  });

  describe('hasExternalChannel', () => {
    it('detects phone numbers', () => {
      expect(hasExternalChannel('0612345678')).toBe(true);
      expect(hasExternalChannel('+213512345678')).toBe(true);
      expect(hasExternalChannel('07-12-34-56-78')).toBe(true);
      expect(hasExternalChannel('un message normal')).toBe(false);
    });

    it('detects social media keywords', () => {
      expect(hasExternalChannel('whatsapp')).toBe(true);
      expect(hasExternalChannel('vi ber')).toBe(true); // "viber" normalized matches
      expect(hasExternalChannel('Insta gram')).toBe(true);
      expect(hasExternalChannel('bonjour')).toBe(false);
    });

    it('detects URLs and emails', () => {
      expect(hasExternalChannel('http://google.com')).toBe(true);
      expect(hasExternalChannel('www.test.dz')).toBe(true);
      expect(hasExternalChannel('test@gmail.com')).toBe(true);
    });
  });
});
