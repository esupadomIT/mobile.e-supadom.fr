const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// Exécute les helpers TS sans ajouter un runner ni modifier le build Expo.
function loadHelper(relative) {
  const filename = path.join(__dirname, '..', relative);
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  const localRequire = (name) => name === '@/lib/tz' ? loadHelper('src/lib/tz.ts') : require(name);
  vm.runInThisContext(`(function(require, module, exports) {${code}\n})`, { filename })(localRequire, loaded, loaded.exports);
  return loaded.exports;
}
const { selectTeacherSlots, validateTeacherSlots, teacherBudget, teacherRequest, validateTeacherFiles, INITIAL_TEACHER_FORM } = loadHelper('src/lib/find-teacher.ts');
const user = { id: 7, role: 'STUDENT', firstName: 'Test', lastName: 'Élève', userClasses: [{ classe: { id: 2, nom: '6ème', niveau: { nom: 'Collège' } } }] };
const slot = (startDate, endDate, isAvailable = true) => ({ id: 1, userId: 7, startDate, endDate, isAvailable });

test('sélectionne les trois premiers jours, dans les sept jours, en ignorant les indisponibilités', () => {
  const input = [
    slot('2026-10-05T10:00:00Z', '2026-10-05T11:00:00Z'),
    slot('2026-10-02T10:00:00Z', '2026-10-02T11:00:00Z'),
    slot('2026-10-03T10:00:00Z', '2026-10-03T11:00:00Z'),
    slot('2026-10-04T10:00:00Z', '2026-10-04T11:00:00Z'),
    slot('2026-10-01T10:00:00Z', '2026-10-01T11:00:00Z', false),
    slot('2026-10-10T10:00:00Z', '2026-10-10T11:00:00Z'),
  ];
  assert.deepEqual(selectTeacherSlots(input, new Date('2026-10-01T08:00:00Z')).map((s) => s.startDate), ['2026-10-02T10:00:00Z', '2026-10-03T10:00:00Z', '2026-10-04T10:00:00Z']);
});

test('utilise minuit à Paris même si le téléphone est dans un autre fuseau', () => {
  const input = [slot('2026-10-01T22:30:00Z', '2026-10-01T23:30:00Z'), slot('2026-10-01T21:30:00Z', '2026-10-01T22:30:00Z')];
  assert.equal(selectTeacherSlots(input, new Date('2026-10-02T00:30:00Z')).length, 1);
});

test('exige trois jours distincts dans le fuseau plateforme, pas trois dates UTC', () => {
  const slots = [slot('2026-10-01T22:30:00Z', '2026-10-01T23:30:00Z'), slot('2026-10-02T08:00:00Z', '2026-10-02T09:00:00Z'), slot('2026-10-03T08:00:00Z', '2026-10-03T09:00:00Z')];
  assert.match(validateTeacherSlots(slots), /3 jours/);
});

test('contrôle la durée minimale et l’option créneaux courts', () => {
  const slots = ['02', '03', '04'].map((day) => slot(`2026-10-${day}T08:00:00Z`, `2026-10-${day}T08:30:00Z`));
  assert.match(validateTeacherSlots(slots), /1 heure/);
  assert.equal(validateTeacherSlots(slots, true), null);
  assert.match(validateTeacherSlots([slot('invalide', 'invalide')]), /invalides/);
});

test('budget Collège : classe exacte et remise horaire appliquée aux quatre heures', () => {
  const result = teacherBudget(user, [{ value: 'soutien_scolaire', price: { '6ème': 18, Collège: 999 } }], [{ value: 'majoration_prix_excellence_vs_coup_de_pouce', price: -2 }]);
  assert.deepEqual(result, { min: 64, max: 72 });
});

test('budget Supérieur : ignore le type masqué et prend le cours particulier', () => {
  const upper = { ...user, userClasses: [{ classe: { id: 9, nom: 'Bac+4', niveau: { nom: 'Supérieur' } } }] };
  const types = [{ value: 'soutien_scolaire', hideFor: ['Supérieur'], price: 10 }, { value: 'cours_et_exos_avec_corriges', price: { 'Bac+4': 30 } }];
  assert.deepEqual(teacherBudget(upper, types, []), { min: 120, max: 120 });
  assert.equal(teacherBudget(user, [], []), null);
});

test('demande : identité du compte, une matière, instantané des créneaux et objectifs libres conservés', () => {
  const slots = [slot('2026-10-02T08:00:00Z', '2026-10-02T09:00:00Z')];
  const form = { ...INITIAL_TEACHER_FORM, matiere: 'Mathématiques', objectives: ['autre'], otherObjective: 'Préparer un oral', teacherId: 'ancienne référence', hasTeacherId: 'no', confirmedAvailability: true, budgetConfirmed: 'yes' };
  const result = teacherRequest(user, form, slots, { min: 64, max: 72 }, true, true);
  assert.deepEqual(result.matieres, ['Mathématiques']);
  assert.equal(result.studentId, 7);
  assert.equal(result.niveau, '6ème');
  assert.equal(result.niveauLabel, 'Collège(6ème)');
  assert.equal(result.teacherId, '');
  assert.deepEqual(result.objectives, ['Autre : Préparer un oral']);
  assert.deepEqual(JSON.parse(result.studentAvailabilitySlots), slots);
  assert.equal(result.sendToConseiller, true);
  assert.equal(result.isAbandon, true);
  assert.throws(() => teacherRequest({ ...user, role: 'INSTRUCTOR' }, form, slots, null), /étudiant/);
});

test('documents : applique les limites par fichier, nombre et total avant envoi', () => {
  const file = { name: 'cours.pdf', size: 1024, mimeType: 'application/pdf' };
  assert.equal(validateTeacherFiles([], [file]), null);
  assert.match(validateTeacherFiles(Array.from({ length: 5 }, () => ({ size: 1 })), [file]), /5 fichiers/);
  assert.match(validateTeacherFiles([], [{ ...file, size: 11 * 1024 * 1024 }]), /10 Mo/);
  assert.match(validateTeacherFiles([{ size: 20 * 1024 * 1024 }], [file]), /20 Mo/);
  assert.match(validateTeacherFiles([], [{ ...file, name: 'code.exe' }]), /Formats/);
});
