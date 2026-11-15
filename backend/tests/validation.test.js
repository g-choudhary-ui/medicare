const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const Joi = require('joi');

describe('Data Validation Schemas', () => {
  const medicationSchema = Joi.object({
    name: Joi.string().required(),
    dosage: Joi.string().required(),
    frequency: Joi.string().required(),
    times: Joi.array()
      .items(Joi.string().valid('morning', 'afternoon', 'evening', 'night'))
      .min(1)
      .required(),
    startDate: Joi.string().isoDate().required(),
    color: Joi.string().default('#0d9488'),
  });

  const appointmentSchema = Joi.object({
    doctorName: Joi.string().required(),
    specialty: Joi.string().required(),
    date: Joi.string().required(),
    time: Joi.string().required(),
  });

  test('Validates complete medication data successfully', () => {
    const validMed = {
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'twice_daily',
      times: ['morning', 'night'],
      startDate: '2026-11-15',
      color: '#0d9488',
    };
    const { error } = medicationSchema.validate(validMed);
    assert.equal(error, undefined);
  });

  test('Rejects medication with invalid time slots', () => {
    const invalidMed = {
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'twice_daily',
      times: ['morning', 'midnight_snack'], // invalid slot
      startDate: '2026-11-15',
    };
    const { error } = medicationSchema.validate(invalidMed);
    assert.ok(error);
  });

  test('Rejects appointment with missing doctor name', () => {
    const invalidAppt = {
      specialty: 'Cardiology',
      date: '2026-11-20',
      time: '10:00 AM',
    };
    const { error } = appointmentSchema.validate(invalidAppt);
    assert.ok(error);
  });
});
