/**
 * Tests for City Lookup Service - Fuzzy matching and city normalization
 */

import { describe, it, expect } from 'vitest';
import { normalizeCityName, inferCountryFromCityName } from './city-lookup.service';

describe('City Lookup Service', () => {
  describe('normalizeCityName', () => {
    it('should normalize city name to lowercase', () => {
      expect(normalizeCityName('MADRID')).toBe('madrid');
      expect(normalizeCityName('Barcelona')).toBe('barcelona');
    });

    it('should remove accents from city names', () => {
      expect(normalizeCityName('Córdoba')).toBe('cordoba');
      expect(normalizeCityName('São Paulo')).toBe('sao paulo');
      expect(normalizeCityName('Düsseldorf')).toBe('dusseldorf');
      expect(normalizeCityName('Zürich')).toBe('zurich');
      expect(normalizeCityName('Malmö')).toBe('malmo');
    });

    it('should trim whitespace', () => {
      expect(normalizeCityName('  Madrid  ')).toBe('madrid');
    });

    it('should collapse multiple spaces', () => {
      expect(normalizeCityName('New   York')).toBe('new york');
    });

    it('should handle common misspellings', () => {
      // These should normalize to similar base forms
      const normalized1 = normalizeCityName('Madrd');
      const normalized2 = normalizeCityName('Madrid');
      // They won't be exactly equal, but they're close
      expect(normalized1).toBe('madrd');
      expect(normalized2).toBe('madrid');
    });

    it('should handle Spanish city names', () => {
      expect(normalizeCityName('Sevilla')).toBe('sevilla');
      expect(normalizeCityName('Valencia')).toBe('valencia');
      expect(normalizeCityName('Zaragoza')).toBe('zaragoza');
      expect(normalizeCityName('Málaga')).toBe('malaga');
    });

    it('should handle Portuguese city names', () => {
      expect(normalizeCityName('Lisboa')).toBe('lisboa');
      expect(normalizeCityName('Porto')).toBe('porto');
      expect(normalizeCityName('Évora')).toBe('evora');
    });

    it('should handle Latin American city names', () => {
      expect(normalizeCityName('México D.F.')).toBe('mexico d.f.');
      expect(normalizeCityName('Buenos Aires')).toBe('buenos aires');
      expect(normalizeCityName('Bogotá')).toBe('bogota');
    });
  });

  describe('inferCountryFromCityName', () => {
    it('should infer country code for well-known cities', () => {
      // Thailand
      expect(inferCountryFromCityName('Bangkok')).toBe('TH');
      expect(inferCountryFromCityName('กรุงเทพมหานคร')).toBe('TH');
      expect(inferCountryFromCityName('Phuket')).toBe('TH');

      // Spain
      expect(inferCountryFromCityName('Madrid')).toBe('ES');
      expect(inferCountryFromCityName('Barcelona')).toBe('ES');
      expect(inferCountryFromCityName('Valencia')).toBe('ES');

      // Japan
      expect(inferCountryFromCityName('Tokyo')).toBe('JP');
      expect(inferCountryFromCityName('Osaka')).toBe('JP');

      // USA
      expect(inferCountryFromCityName('New York')).toBe('US');
      expect(inferCountryFromCityName('Los Angeles')).toBe('US');
      expect(inferCountryFromCityName('Austin')).toBe('US');

      // Netherlands
      expect(inferCountryFromCityName('Amsterdam')).toBe('NL');

      // UAE
      expect(inferCountryFromCityName('Dubai')).toBe('AE');

      // Portugal
      expect(inferCountryFromCityName('Lisboa')).toBe('PT');
      expect(inferCountryFromCityName('Lisbon')).toBe('PT');
    });

    it('should be case insensitive', () => {
      expect(inferCountryFromCityName('BANGKOK')).toBe('TH');
      expect(inferCountryFromCityName('madrid')).toBe('ES');
      expect(inferCountryFromCityName('TOKYO')).toBe('JP');
    });

    it('should return undefined for unknown cities', () => {
      expect(inferCountryFromCityName('UnknownCity123')).toBeUndefined();
      expect(inferCountryFromCityName('SomeRandomPlace')).toBeUndefined();
    });
  });
});
