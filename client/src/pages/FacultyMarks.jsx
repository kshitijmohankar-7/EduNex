import { useEffect, useState } from 'react';

import { api } from '../services/api';


// ======================================================
// EXAM TYPES
// ======================================================

const EXAM_TYPES = [
  'CT1',
  'CT2',
  'INTERNAL',
  'EXTERNAL',
  'END SEMESTER',
];


export default function FacultyMarks() {

  // ====================================================
  // STUDENT SEARCH
  // ====================================================

  const [search, setSearch] =
    useState('');

  const [searchResults, setSearchResults] =
    useState([]);

  const [searching, setSearching] =
    useState(false);


  // ====================================================
  // SELECTED STUDENT
  // ====================================================

  const [student, setStudent] =
    useState(null);


  // ====================================================
  // SUBJECTS
  // ====================================================

  const [subjects, setSubjects] =
    useState([]);


  // ====================================================
  // EXAM
  // ====================================================

  const [examType, setExamType] =
    useState('CT1');


  // ====================================================
  // TOTAL MARKS
  // ====================================================

  const [maxMarks, setMaxMarks] =
    useState('');


  // ====================================================
  // MARKS
  // ====================================================

  const [marks, setMarks] =
    useState({});


  // ====================================================
  // LOADING
  // ====================================================

  const [loadingSubjects, setLoadingSubjects] =
    useState(false);

  const [loadingMarks, setLoadingMarks] =
    useState(false);

  const [saving, setSaving] =
    useState(false);


  // ====================================================
  // MESSAGES
  // ====================================================

  const [error, setError] =
    useState('');

  const [message, setMessage] =
    useState('');


  // ====================================================
  // SEARCH STUDENT
  // ====================================================

  async function handleSearch(e) {

    e?.preventDefault();

    setError('');
    setMessage('');
    setSearchResults([]);

    if (!search.trim()) {
      setError(
        'Enter student name or student code.'
      );

      return;
    }


    try {

      setSearching(true);

      const data =
        await api.searchStudentsForMarks(
          search.trim()
        );


      setSearchResults(
        Array.isArray(data)
          ? data
          : []
      );


      if (
        !Array.isArray(data) ||
        data.length === 0
      ) {
        setError(
          'No student found.'
        );
      }

    } catch (err) {

      console.error(err);

      setError(
        err.message ||
        'Unable to search students.'
      );

    } finally {

      setSearching(false);

    }
  }


  // ====================================================
  // SELECT STUDENT
  // ====================================================

  async function selectStudent(
    selectedStudent
  ) {

    setError('');
    setMessage('');

    setStudent(
      selectedStudent
    );

    setSearchResults([]);

    setSearch(
      selectedStudent.student_code
    );

    setSubjects([]);

    setMarks({});

    setMaxMarks('');


    try {

      setLoadingSubjects(true);


      const data =
        await api.getStudentMarkSubjects(
          selectedStudent.id
        );


      const studentData =
        data?.student ||
        selectedStudent;


      const subjectData =
        Array.isArray(
          data?.subjects
        )
          ? data.subjects
          : [];


      setStudent(
        studentData
      );

      setSubjects(
        subjectData
      );


      // Load marks for current exam
      await loadMarks(
        selectedStudent.id,
        examType,
        subjectData
      );

    } catch (err) {

      console.error(err);

      setError(
        err.message ||
        'Unable to load student subjects.'
      );

      setSubjects([]);

    } finally {

      setLoadingSubjects(false);

    }
  }


  // ====================================================
  // LOAD MARKS
  // ====================================================

  async function loadMarks(
    studentId,
    selectedExam,
    subjectList = subjects
  ) {

    if (!studentId) {
      return;
    }


    try {

      setLoadingMarks(true);

      setError('');


      const data =
        await api.getStudentMarksForExam(
          studentId,
          selectedExam
        );


      const returnedSubjects =
        Array.isArray(
          data?.subjects
        )
          ? data.subjects
          : subjectList;


      // ------------------------------------------------
      // Set subjects if backend returned them
      // ------------------------------------------------

      if (
        returnedSubjects &&
        returnedSubjects.length > 0
      ) {
        setSubjects(
          returnedSubjects
        );
      }


      // ------------------------------------------------
      // Restore max marks
      // ------------------------------------------------

      const firstExistingMark =
        returnedSubjects
          ?.map(
            (subject) =>
              subject.mark
          )
          .find(
            (mark) =>
              mark &&
              mark.maxMarks !==
                undefined
          );


      if (
        firstExistingMark
      ) {

        setMaxMarks(
          String(
            firstExistingMark.maxMarks
          )
        );

      } else {

        setMaxMarks('');

      }


      // ------------------------------------------------
      // Restore obtained marks
      // ------------------------------------------------

      const markValues = {};


      (
        returnedSubjects || []
      ).forEach(
        (subject) => {

          if (
            subject.mark &&
            subject.mark.obtainedMarks !==
              undefined &&
            subject.mark.obtainedMarks !==
              null
          ) {

            markValues[
              subject.id
            ] =
              String(
                subject.mark.obtainedMarks
              );

          } else {

            markValues[
              subject.id
            ] = '';

          }

        }
      );


      setMarks(
        markValues
      );

    } catch (err) {

      console.error(err);

      setError(
        err.message ||
        'Unable to load existing marks.'
      );

      setMarks({});

    } finally {

      setLoadingMarks(false);

    }
  }


  // ====================================================
  // CHANGE EXAM TYPE
  // ====================================================

  async function handleExamChange(
    e
  ) {

    const selectedExam =
      e.target.value;


    setExamType(
      selectedExam
    );

    setError('');
    setMessage('');


    // No student selected
    if (!student) {
      setMarks({});
      setMaxMarks('');
      return;
    }


    await loadMarks(
      student.id,
      selectedExam,
      subjects
    );
  }


  // ====================================================
  // CHANGE MARK
  // ====================================================

  function handleMarkChange(
    subjectId,
    value
  ) {

    // Allow blank
    if (value === '') {

      setMarks(
        (previous) => ({
          ...previous,
          [subjectId]: '',
        })
      );

      return;
    }


    // Only numbers
    if (
      !/^\d*\.?\d*$/.test(value)
    ) {
      return;
    }


    setMarks(
      (previous) => ({
        ...previous,
        [subjectId]: value,
      })
    );
  }


  // ====================================================
  // SAVE ALL MARKS
  // ====================================================

  async function handleSave(
    e
  ) {

    e.preventDefault();

    setError('');
    setMessage('');


    if (!student) {

      setError(
        'Please select a student first.'
      );

      return;
    }


    if (!maxMarks) {

      setError(
        'Enter total marks for the paper.'
      );

      return;
    }


    const total =
      Number(maxMarks);


    if (
      !Number.isFinite(total) ||
      total <= 0
    ) {

      setError(
        'Total marks must be greater than 0.'
      );

      return;
    }


    // ------------------------------------------------
    // Validate external-only subjects
    // ------------------------------------------------

    if (
      examType !== 'EXTERNAL'
    ) {

      const invalidSubjects =
        subjects.filter(
          (subject) =>
            subject.externalOnly
        );


      // These subjects simply shouldn't
      // be sent for CT1/CT2/etc.
      //
      // Their UI is disabled.
      //
      // So we don't block the complete save.
      //
      // They are ignored below.
    }


    // ------------------------------------------------
    // Prepare marks
    // ------------------------------------------------

    const marksData =
      subjects
        .filter(
          (subject) => {

            // External-only subjects
            // are valid only for EXTERNAL.
            if (
              subject.externalOnly &&
              examType !==
                'EXTERNAL'
            ) {
              return false;
            }

            return true;
          }
        )
        .map(
          (subject) => ({

            subjectId:
              subject.id,

            obtainedMarks:
              marks[
                subject.id
              ],
          })
        )
        .filter(
          (item) =>
            item.obtainedMarks !==
              '' &&
            item.obtainedMarks !==
              undefined &&
            item.obtainedMarks !==
              null
        );


    if (
      marksData.length === 0
    ) {

      setError(
        'Enter at least one subject mark.'
      );

      return;
    }


    // ------------------------------------------------
    // Client-side validation
    // ------------------------------------------------

    for (
      const item of marksData
    ) {

      const obtained =
        Number(
          item.obtainedMarks
        );


      if (
        !Number.isFinite(
          obtained
        )
      ) {

        setError(
          'Marks must be valid numbers.'
        );

        return;
      }


      if (
        obtained < 0 ||
        obtained > total
      ) {

        const subject =
          subjects.find(
            (s) =>
              Number(s.id) ===
              Number(item.subjectId)
          );


        setError(
          `Marks for ${
            subject?.name ||
            'subject'
          } must be between 0 and ${total}.`
        );

        return;
      }
    }


    // ------------------------------------------------
    // SAVE
    // ------------------------------------------------

    try {

      setSaving(true);


      const result =
        await api.saveBulkMarks({

          studentId:
            student.id,

          examType,

          maxMarks:
            total,

          marks:
            marksData,
        });


      setMessage(
        result?.message ||
        'Marks saved successfully.'
      );


      // Reload marks so UI is
      // synchronized with database
      await loadMarks(
        student.id,
        examType,
        subjects
      );


    } catch (err) {

      console.error(err);

      setError(
        err.message ||
        'Unable to save marks.'
      );

    } finally {

      setSaving(false);

    }
  }


  // ====================================================
  // SEARCH ANOTHER STUDENT
  // ====================================================

  function handleAnotherStudent() {

    setStudent(null);

    setSubjects([]);

    setMarks({});

    setMaxMarks('');

    setSearch('');

    setSearchResults([]);

    setError('');

    setMessage('');

  }


  // ====================================================
  // AUTO LOAD MARKS WHEN STUDENT EXISTS
  // ====================================================

  useEffect(
    () => {

      if (
        student &&
        subjects.length > 0
      ) {

        loadMarks(
          student.id,
          examType,
          subjects
        );

      }

    },
    [examType]
  );


  // ====================================================
  // UI
  // ====================================================

  return (

    <div>

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="ledger-heading">

        <h2>
          Faculty Marks
        </h2>

        <span className="count">
          Student-wise entry
        </span>

      </div>

      <hr className="ledger-rule" />


      {/* ==================================================
          SEARCH
      ================================================== */}

      {!student && (

        <div className="panel">

          <h3>
            Search Student
          </h3>

          <form
            onSubmit={
              handleSearch
            }

            style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
              marginTop: 15,
            }}
          >

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Student name or student code"
              style={{
                flex: 1,
                minWidth: 280,
                padding: '10px 12px',
              }}
            />

            <button
              type="submit"
              className="btn"
              disabled={searching}
            >

              {searching
                ? 'Searching...'
                : 'Search Student'}

            </button>

          </form>


          {/* Search results */}

          {searchResults.length >
            0 && (

            <div
              style={{
                marginTop: 15,
              }}
            >

              {searchResults.map(
                (result) => (

                  <button
                    key={result.id}
                    type="button"
                    onClick={() =>
                      selectStudent(
                        result
                      )
                    }
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: 12,
                      marginBottom: 8,
                      cursor: 'pointer',
                      background:
                        'transparent',
                      border:
                        '1px solid var(--line)',
                      color:
                        'inherit',
                    }}
                  >

                    <strong>
                      {
                        result.student_name
                      }
                    </strong>

                    <br />

                    <span
                      style={{
                        fontSize: 13,
                        color:
                          'var(--muted-text)',
                      }}
                    >
                      {
                        result.student_code
                      }

                      {' · '}

                      {result.email}

                    </span>

                  </button>

                )
              )}

            </div>

          )}

        </div>

      )}


      {/* ==================================================
          ERROR
      ================================================== */}

      {error && (

        <div
          className="panel"
          style={{
            borderColor:
              'crimson',
          }}
        >

          <div className="error-text">
            {error}
          </div>

        </div>

      )}


      {/* ==================================================
          SUCCESS
      ================================================== */}

      {message && (

        <div className="panel">

          <div className="success-text">
            {message}
          </div>

        </div>

      )}


      {/* ==================================================
          SELECTED STUDENT
      ================================================== */}

      {student && (

        <>

          <div className="panel">

            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems:
                  'center',
                gap: 20,
                flexWrap:
                  'wrap',
              }}
            >

              <div>

                <h2
                  style={{
                    margin:
                      '0 0 6px',
                  }}
                >
                  {
                    student.student_name
                  }
                </h2>

                <div
                  style={{
                    color:
                      'var(--muted-text)',
                  }}
                >
                  {
                    student.student_code
                  }
                </div>

              </div>


              <button
                type="button"
                className="btn btn-outline"
                onClick={
                  handleAnotherStudent
                }
              >
                Search Another Student
              </button>

            </div>

          </div>


          {/* ==================================================
              EXAM CONTROLS
          ================================================== */}

          <div className="panel">

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 20,
              }}
            >

              <div>

                <label
                  style={{
                    display:
                      'block',
                    marginBottom:
                      8,
                    fontWeight:
                      600,
                  }}
                >
                  Exam Type
                </label>

                <select
                  value={
                    examType
                  }
                  onChange={
                    handleExamChange
                  }
                  style={{
                    width:
                      '100%',
                    padding:
                      '10px 12px',
                  }}
                >

                  {EXAM_TYPES.map(
                    (exam) => (

                      <option
                        key={exam}
                        value={exam}
                      >
                        {exam}
                      </option>

                    )
                  )}

                </select>

              </div>


              <div>

                <label
                  style={{
                    display:
                      'block',
                    marginBottom:
                      8,
                    fontWeight:
                      600,
                  }}
                >
                  Total Marks
                </label>

                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={
                    maxMarks
                  }
                  onChange={(e) =>
                    setMaxMarks(
                      e.target.value
                    )
                  }
                  placeholder="e.g. 20"
                  style={{
                    width:
                      '100%',
                    padding:
                      '10px 12px',
                  }}
                />

              </div>

            </div>


            <div
              style={{
                marginTop:
                  15,
                fontSize: 13,
                color:
                  'var(--muted-text)',
              }}
            >

              {examType ===
                'EXTERNAL'
                ? 'Micro Project, Lab and Liberal Learning subjects are available for External.'
                : 'Micro Project, Lab and Liberal Learning subjects are External-only.'}

            </div>

          </div>


          {/* ==================================================
              SUBJECTS
          ================================================== */}

          <div className="panel">

            <div
              className="ledger-heading"
            >

              <h2>
                {examType} Marks
              </h2>

              <span className="count">

                {
                  subjects.length
                }

                {' '}
                enrolled subject
                {subjects.length !==
                1
                  ? 's'
                  : ''}

              </span>

            </div>


            {loadingSubjects ||
            loadingMarks ? (

              <p>
                Loading subjects and marks...
              </p>

            ) : subjects.length ===
              0 ? (

              <p>
                This student has no enrolled subjects.
              </p>

            ) : (

              <form
                onSubmit={
                  handleSave
                }
              >

                <div
                  style={{
                    overflowX:
                      'auto',
                  }}
                >

                  <table className="ledger-table">

                    <thead>

                      <tr>

                        <th>
                          #
                        </th>

                        <th>
                          Subject
                        </th>

                        <th>
                          Code
                        </th>

                        <th>
                          Marks
                        </th>

                        <th>
                          Total
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {subjects.map(
                        (
                          subject,
                          index
                        ) => {

                          const externalOnly =
                            subject.externalOnly;

                          const disabled =
                            externalOnly &&
                            examType !==
                              'EXTERNAL';


                          return (

                            <tr
                              key={
                                subject.id
                              }
                            >

                              <td>
                                {
                                  index +
                                  1
                                }
                              </td>


                              <td>

                                <strong>
                                  {
                                    subject.name
                                  }
                                </strong>

                                {externalOnly && (

                                  <div
                                    style={{
                                      fontSize:
                                        11,
                                      marginTop:
                                        4,
                                      color:
                                        'var(--muted-text)',
                                    }}
                                  >
                                    EXTERNAL ONLY
                                  </div>

                                )}

                              </td>


                              <td>

                                <span className="code-stamp">
                                  {
                                    subject.code
                                  }
                                </span>

                              </td>


                              <td>

                                {disabled ? (

                                  <span
                                    style={{
                                      color:
                                        'var(--muted-text)',
                                      fontSize:
                                        13,
                                    }}
                                  >
                                    External only
                                  </span>

                                ) : (

                                  <input
                                    type="number"
                                    min="0"
                                    max={
                                      maxMarks ||
                                      undefined
                                    }
                                    step="0.5"
                                    value={
                                      marks[
                                        subject.id
                                      ] ??
                                      ''
                                    }
                                    onChange={(
                                      e
                                    ) =>
                                      handleMarkChange(
                                        subject.id,
                                        e.target.value
                                      )
                                    }
                                    placeholder="Marks"
                                    style={{
                                      width:
                                        120,
                                      padding:
                                        '9px 10px',
                                    }}
                                  />

                                )}

                              </td>


                              <td>

                                <strong>
                                  /
                                  {maxMarks ||
                                    '—'}
                                </strong>

                              </td>

                            </tr>

                          );

                        }
                      )}

                    </tbody>

                  </table>

                </div>


                {/* SAVE */}

                <div
                  style={{
                    marginTop:
                      20,
                    display:
                      'flex',
                    gap: 10,
                    flexWrap:
                      'wrap',
                  }}
                >

                  <button
                    type="submit"
                    className="btn"
                    disabled={
                      saving ||
                      loadingMarks
                    }
                  >

                    {saving
                      ? 'Saving...'
                      : `Save ${examType} Marks`}

                  </button>


                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={
                      handleAnotherStudent
                    }
                  >
                    Search Another Student
                  </button>

                </div>

              </form>

            )}

          </div>

        </>

      )}

    </div>
  );
}