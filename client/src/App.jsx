
import { useCallback, useEffect, useState } from 'react'
import './App.css'
import Login from './Login'
import Register from './Register'

function App() {
  const [authData, setAuthData] = useState(() => {
    try {
      const saved = localStorage.getItem('studentMSAuth')
      return saved ? JSON.parse(saved) : null
    } catch {
      localStorage.removeItem('studentMSAuth')
      return null
    }
  })

  const [authPage, setAuthPage] = useState('login')

  const [apiMessage, setApiMessage] = useState(
    'Connecting to backend...'
  )
  const [students, setStudents] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [connectionError, setConnectionError] = useState(false)
  const [studentsError, setStudentsError] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    department: '',
    semester: '3',
  })

  const [formMessage, setFormMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [actionMessage, setActionMessage] = useState('')

  const handleLogin = (data) => {
    if (!data?.token) {
      setActionMessage('Login failed: authentication token was not received.')
      return
    }

    localStorage.setItem('studentMSAuth', JSON.stringify(data))
    setAuthData(data)
    setActionMessage('')
  }

  const handleLogout = () => {
    localStorage.removeItem('studentMSAuth')
    setAuthData(null)
    setAuthPage('login')
    setStudents([])
    setEditingStudent(null)
    setSearchTerm('')
    setActionMessage('')
    setFormMessage('')
  }

  const fetchStudents = useCallback(async () => {
    if (!authData?.token) {
      setStudents([])
      return
    }

    try {
      const response = await fetch(
        'http://localhost:5000/api/students',
        {
          headers: {
            Authorization: `Bearer ${authData.token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          handleLogout()
          return
        }

        throw new Error(data.message || 'Failed to load students.')
      }

      setStudents(data)
      setStudentsError(false)
    } catch (error) {
      console.error('Error fetching students:', error)
      setStudentsError(true)
    }
  }, [authData?.token])

  useEffect(() => {
    fetch('http://localhost:5000/')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Backend request failed')
        }
        return response.json()
      })
      .then((data) => {
        setApiMessage(data.message)
        setConnectionError(false)
      })
      .catch(() => {
        setApiMessage('Could not connect to backend.')
        setConnectionError(true)
      })
  }, [])

  useEffect(() => {
    if (authData?.token) {
      fetchStudents()
    } else {
      setStudents([])
      setStudentsError(false)
    }
  }, [authData?.token, fetchStudents])

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    })
  }

  const resetForm = () => {
    setEditingStudent(null)
    setFormData({
      name: '',
      rollNumber: '',
      department: '',
      semester: '3',
    })
    setFormMessage('')
  }

  const startEdit = (student) => {
    setEditingStudent(student)

    setFormData({
      name: student.name,
      rollNumber: student.rollNumber,
      department: student.department,
      semester: String(student.semester),
    })

    setFormMessage('')
    setActionMessage('Editing ' + student.name)
  }

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this student?'
    )

    if (!confirmed) return

    try {
      const response = await fetch(
        `http://localhost:5000/api/students/${id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authData?.token}`,
          },
        }
      )

      const data = await response.json()

      if (response.status === 401) {
        handleLogout()
        return
      }

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to delete student.'
        )
      }

      if (editingStudent?._id === id) {
        resetForm()
      }

      setActionMessage('Student deleted successfully.')
      await fetchStudents()
    } catch (error) {
      setActionMessage(error.message)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormMessage('')
    setSaving(true)

    const isEditing = Boolean(editingStudent)

    try {
      const url = isEditing
        ? `http://localhost:5000/api/students/${editingStudent._id}`
        : 'http://localhost:5000/api/students'

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authData?.token}`,
        },
        body: JSON.stringify({
          ...formData,
          semester: Number(formData.semester),
        }),
      })

      const data = await response.json()

      if (response.status === 401) {
        handleLogout()
        return
      }

      if (!response.ok) {
        throw new Error(
          response.status === 409
            ? 'This roll number already exists.'
            : data.message || 'Could not save student.'
        )
      }

      setFormMessage(
        isEditing
          ? 'Student updated successfully!'
          : 'Student added successfully!'
      )

      setEditingStudent(null)
      setFormData({
        name: '',
        rollNumber: '',
        department: '',
        semester: '3',
      })

      await fetchStudents()
    } catch (error) {
      setFormMessage(
        error.message || 'Could not connect to backend.'
      )
    } finally {
      setSaving(false)
    }
  }

  const departmentCount = new Set(
    students.map((student) => student.department)
  ).size

  const filteredStudents = students.filter((student) => {
    const search = searchTerm.toLowerCase()

    return (
      student.name.toLowerCase().includes(search) ||
      student.rollNumber.toLowerCase().includes(search)
    )
  })

  // Show login or registration when the user is not logged in.
  if (!authData?.token) {
    return authPage === 'login' ? (
      <Login
        onLogin={handleLogin}
        onShowRegister={() => setAuthPage('register')}
      />
    ) : (
      <Register
        onRegister={() => setAuthPage('login')}
        onShowLogin={() => setAuthPage('login')}
      />
    )
  }

  // Main dashboard
  return (
    <div className="app">
      <aside className="sidebar">
        <h2>StudentMS</h2>

        <nav>
          <a href="#dashboard" className="active">Dashboard</a>
          <a href="#add-student">Add Student</a>
          <a href="#students">Students</a>
        </nav>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <h1>Student Management System</h1>

          <div>
            <span>
              {authData.user?.name || authData.user?.email || 'User'}
              {' '}({authData.user?.role || 'User'})
            </span>

            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="welcome">
          <h2>Welcome to StudentMS</h2>
          <p>Manage student records from one place.</p>
        </section>

        <section className="stats">
          <div className="stat-card">
            <h3>Total Students</h3>
            <p>{studentsError ? '—' : students.length}</p>
          </div>

          <div className="stat-card">
            <h3>Recent Registrations (7 Days)</h3>
            <p>
              {studentsError
                ? '—'
                : students.filter((student) => {
                    const registrationDate = new Date(
                      student.createdAt
                    )
                    const sevenDaysAgo = new Date()
                    sevenDaysAgo.setDate(
                      sevenDaysAgo.getDate() - 7
                    )

                    return registrationDate >= sevenDaysAgo
                  }).length}
            </p>
          </div>

          <div className="stat-card">
            <h3>Departments</h3>
            <p>{studentsError ? '—' : departmentCount}</p>
          </div>
        </section>

        <section className="welcome" id="add-student">
          <h2>
            {editingStudent ? 'Edit Student' : 'Add New Student'}
          </h2>

          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name">Student Name</label>
              <input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter student name"
                required
              />
            </div>

            <div>
              <label htmlFor="rollNumber">Roll Number</label>
              <input
                id="rollNumber"
                name="rollNumber"
                value={formData.rollNumber}
                onChange={handleChange}
                placeholder="e.g. SEF-002"
                required
              />
            </div>

            <div>
              <label htmlFor="department">Department</label>
              <input
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g. Software Engineering"
                required
              />
            </div>

            <div>
              <label htmlFor="semester">Semester</label>
              <select
                id="semester"
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                required
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => (
                  <option key={semester} value={semester}>
                    Semester {semester}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={saving}>
              {saving
                ? 'Saving...'
                : editingStudent
                  ? 'Update Student'
                  : 'Add Student'}
            </button>

            {editingStudent && (
              <button
                type="button"
                onClick={resetForm}
              >
                Cancel Edit
              </button>
            )}
          </form>

          {formMessage && <p role="status">{formMessage}</p>}
        </section>

        <section className="welcome">
          <h2>Backend Connection</h2>
          <p>{apiMessage}</p>
          <p>
            Status:{' '}
            {connectionError
              ? 'Disconnected'
              : 'Connected'}
          </p>
        </section>

        <section className="welcome" id="students">
          <h2>Student Records</h2>

          {actionMessage && (
            <p
              role="status"
              style={{
                padding: '10px 14px',
                margin: '12px 0',
                borderRadius: '8px',
                backgroundColor: '#dcfce7',
                color: '#166534',
              }}
            >
              {actionMessage}
            </p>
          )}

          <input
            type="text"
            placeholder="Search by name or roll number..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />

          {studentsError ? (
            <p>Could not load student records. Check your backend.</p>
          ) : filteredStudents.length === 0 ? (
            <p>No students found.</p>
          ) : (
            filteredStudents.map((student) => (
              <div key={student._id} className="stat-card">
                <h3>{student.name}</h3>
                <p>Roll Number: {student.rollNumber}</p>
                <p>Department: {student.department}</p>
                <p>Semester: {student.semester}</p>

                <button
                  type="button"
                  onClick={() => startEdit(student)}
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(student._id)}
                  className="delete-button"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  )
}

export default App
