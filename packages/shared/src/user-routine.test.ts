import { describe, expect, it } from 'vitest';
import { USER_ROUTINE_LIMITS, addStep, moveStep, removeStep, setStepSeconds, validateUserRoutine } from './user-routine';

const step = (acupointId: string, seconds = 60) => ({ acupointId, seconds });

describe('USER_ROUTINE_LIMITS', () => {
  it('matches the spec', () => {
    expect(USER_ROUTINE_LIMITS).toEqual({ nameMaxLength: 20, stepsMax: 10, secondsMin: 10, secondsMax: 600, secondsStep: 10 });
  });
});

describe('validateUserRoutine', () => {
  it('accepts a valid routine and trims the name', () => {
    const result = validateUserRoutine({ name: '  아침 루틴  ', steps: [step('LI4')], sourceSymptomId: null });
    expect(result).toEqual({ ok: true, value: { name: '아침 루틴', steps: [step('LI4')], sourceSymptomId: null } });
  });

  it('rejects an empty name', () => {
    expect(validateUserRoutine({ name: '', steps: [step('LI4')], sourceSymptomId: null })).toEqual({
      ok: false,
      errors: ['이름을 적어 주세요.'],
    });
  });

  it('rejects a name that is only whitespace', () => {
    expect(validateUserRoutine({ name: '   ', steps: [step('LI4')], sourceSymptomId: null })).toEqual({
      ok: false,
      errors: ['이름을 적어 주세요.'],
    });
  });

  it('rejects a name over 20 characters', () => {
    const result = validateUserRoutine({ name: 'a'.repeat(21), steps: [step('LI4')], sourceSymptomId: null });
    expect(result).toEqual({ ok: false, errors: ['이름은 20자까지 적을 수 있어요.'] });
  });

  it('accepts a name at exactly 20 characters', () => {
    const result = validateUserRoutine({ name: 'a'.repeat(20), steps: [step('LI4')], sourceSymptomId: null });
    expect(result.ok).toBe(true);
  });

  it('rejects zero steps', () => {
    expect(validateUserRoutine({ name: '루틴', steps: [], sourceSymptomId: null })).toEqual({
      ok: false,
      errors: ['혈자리를 하나 이상 넣어 주세요.'],
    });
  });

  it('rejects more than 10 steps', () => {
    const steps = Array.from({ length: 11 }, (_, i) => step(`LI${(i % 9) + 1}`));
    expect(validateUserRoutine({ name: '루틴', steps, sourceSymptomId: null })).toEqual({
      ok: false,
      errors: ['혈자리는 10개까지 넣을 수 있어요.'],
    });
  });

  it('accepts exactly 10 steps', () => {
    const steps = Array.from({ length: 10 }, (_, i) => step(`LI${(i % 9) + 1}`));
    expect(validateUserRoutine({ name: '루틴', steps, sourceSymptomId: null }).ok).toBe(true);
  });

  it('allows the same acupoint to repeat', () => {
    const steps = [step('LI4'), step('LI4')];
    expect(validateUserRoutine({ name: '루틴', steps, sourceSymptomId: null }).ok).toBe(true);
  });

  it('collects every error at once', () => {
    expect(validateUserRoutine({ name: '', steps: [], sourceSymptomId: null })).toEqual({
      ok: false,
      errors: ['이름을 적어 주세요.', '혈자리를 하나 이상 넣어 주세요.'],
    });
  });

  it('keeps a valid sourceSymptomId', () => {
    const result = validateUserRoutine({ name: '루틴', steps: [step('LI4')], sourceSymptomId: 'headache' });
    expect(result).toEqual({ ok: true, value: { name: '루틴', steps: [step('LI4')], sourceSymptomId: 'headache' } });
  });
});

describe('addStep', () => {
  it('appends a step without mutating the input', () => {
    const steps = [step('LI4')];
    const result = addStep(steps, step('ST36'));
    expect(result).toEqual([step('LI4'), step('ST36')]);
    expect(steps).toEqual([step('LI4')]);
  });

  it('clamps and snaps the new step seconds', () => {
    expect(addStep([], step('LI4', 605))).toEqual([step('LI4', 600)]);
    expect(addStep([], step('LI4', 4))).toEqual([step('LI4', 10)]);
    expect(addStep([], step('LI4', 63))).toEqual([step('LI4', 60)]);
  });
});

describe('removeStep', () => {
  it('removes the step at the given index without mutating the input', () => {
    const steps = [step('LI4'), step('ST36'), step('SP6')];
    const result = removeStep(steps, 1);
    expect(result).toEqual([step('LI4'), step('SP6')]);
    expect(steps).toHaveLength(3);
  });

  it('is a no-op for an out-of-range index', () => {
    const steps = [step('LI4')];
    expect(removeStep(steps, 5)).toEqual(steps);
    expect(removeStep(steps, -1)).toEqual(steps);
  });
});

describe('moveStep', () => {
  it('moves a step from one index to another without mutating the input', () => {
    const steps = [step('LI4'), step('ST36'), step('SP6')];
    const result = moveStep(steps, 0, 2);
    expect(result).toEqual([step('ST36'), step('SP6'), step('LI4')]);
    expect(steps).toEqual([step('LI4'), step('ST36'), step('SP6')]);
  });

  it('moves a step backwards', () => {
    const steps = [step('LI4'), step('ST36'), step('SP6')];
    expect(moveStep(steps, 2, 0)).toEqual([step('SP6'), step('LI4'), step('ST36')]);
  });

  it('is a no-op for an out-of-range index', () => {
    const steps = [step('LI4'), step('ST36')];
    expect(moveStep(steps, 0, 5)).toEqual(steps);
    expect(moveStep(steps, -1, 1)).toEqual(steps);
  });
});

describe('setStepSeconds', () => {
  it('sets the seconds for the step at the given index without mutating the input', () => {
    const steps = [step('LI4', 60), step('ST36', 60)];
    const result = setStepSeconds(steps, 1, 90);
    expect(result).toEqual([step('LI4', 60), step('ST36', 90)]);
    expect(steps).toEqual([step('LI4', 60), step('ST36', 60)]);
  });

  it('clamps below the minimum up to 10', () => {
    expect(setStepSeconds([step('LI4', 60)], 0, 4)).toEqual([step('LI4', 10)]);
  });

  it('clamps above the maximum down to 600', () => {
    expect(setStepSeconds([step('LI4', 60)], 0, 999)).toEqual([step('LI4', 600)]);
  });

  it('snaps to the nearest multiple of 10', () => {
    expect(setStepSeconds([step('LI4', 60)], 0, 63)).toEqual([step('LI4', 60)]);
    expect(setStepSeconds([step('LI4', 60)], 0, 66)).toEqual([step('LI4', 70)]);
  });

  it('is a no-op for an out-of-range index', () => {
    const steps = [step('LI4', 60)];
    expect(setStepSeconds(steps, 5, 90)).toEqual(steps);
  });
});
