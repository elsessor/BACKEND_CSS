import type {
  CreditedSubject,
  CurriculumSubject,
  ShiftApplication,
  StudentAcademicProfile,
  SubjectEquivalencyRecord
} from "../domain/models.js";
import { createEquivalencyId } from "../utils/ids.js";
import { nowIso } from "../utils/time.js";

export class EquivalencyService {
  generate(application: ShiftApplication, profile: StudentAcademicProfile, curriculum: CurriculumSubject[]): SubjectEquivalencyRecord {
    const creditedSubjects: CreditedSubject[] = [];
    const retakeSubjects: string[] = [];

    for (const targetSubject of curriculum) {
      const equivalent = profile.subjects.find((completed) =>
        targetSubject.equivalents?.includes(completed.subject_code)
      );

      if (equivalent && typeof equivalent.grade === "number" && equivalent.grade <= 3) {
        creditedSubjects.push({
          subject_code: equivalent.subject_code,
          equivalent_to: targetSubject.subject_code,
          units: equivalent.units,
          grade: equivalent.grade,
          status: "credited"
        });
      } else {
        retakeSubjects.push(targetSubject.subject_code);
      }
    }

    const totalTargetUnits = curriculum.reduce((sum, subject) => sum + subject.units, 0);
    const creditedUnits = creditedSubjects.reduce((sum, subject) => sum + subject.units, 0);

    return {
      equivalency_id: createEquivalencyId(),
      application_id: application.application_id,
      student_id: application.student_id,
      credited_subjects: creditedSubjects,
      retake_subjects: retakeSubjects,
      new_units_required: Math.max(totalTargetUnits - creditedUnits, 0),
      generated_at: nowIso()
    };
  }
}
