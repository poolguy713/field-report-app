"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"

type FieldReportRow = {
  id: string
  address: string | null
  problem: string | null
  priority: string | null
  notes: string | null
  submitted_by: string | null
  status: string | null
  created_at: string | null
}

type FieldReportMediaRow = {
  id?: string
  report_id: string | null
  file_url: string | null
  file_name: string | null
  file_type: string | null
}

type ProblemTypeRow = {
  label: string
  estimated_cost: number | null
}

type AppUser = {
  id: string
  name: string
  pin: string
  role: "tech" | "office"
  active: boolean
}

type ReportWithMedia = FieldReportRow & {
  media: FieldReportMediaRow[]
  estimated_cost: number
}

type AssignmentRow = {
  id: string
  address: string | null
  tech_name: string | null
  service_date: string | null
  job: string | null
  notes: string | null
  status: string | null
  photo_url: string | null
  created_at: string | null
}

function formatDate(value: string | null) {
  if (!value) return "No date"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString()
}

function formatDateOnly(value: string | null) {
  if (!value) return "No date"
  const d = new Date(`${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString()
}

function formatMoney(value: number) {
  if (!value || value <= 0) return "Not set"
  return `$${value.toFixed(0)}`
}

function getPriorityStyle(priority: string | null) {
  const p = (priority || "normal").trim().toLowerCase()

  if (p === "urgent") {
    return {
      label: "🔴 Urgent",
      bg: "#fee2e2",
      border: "#ef4444",
      text: "#991b1b",
    }
  }

  if (p === "low") {
    return {
      label: "🟢 Low",
      bg: "#dcfce7",
      border: "#22c55e",
      text: "#166534",
    }
  }

  return {
    label: "🟡 Normal",
    bg: "#fef3c7",
    border: "#f59e0b",
    text: "#92400e",
  }
}

function getStatusStyle(status: string | null) {
  const s = (status || "open").trim().toLowerCase()

  if (s === "resolved") {
    return {
      label: "Resolved",
      bg: "#dcfce7",
      border: "#22c55e",
      text: "#166534",
    }
  }

  if (s === "in_progress") {
    return {
      label: "In Progress",
      bg: "#dbeafe",
      border: "#3b82f6",
      text: "#1d4ed8",
    }
  }

  return {
    label: "Open",
    bg: "#fee2e2",
    border: "#ef4444",
    text: "#991b1b",
  }
}

function getAssignmentStatusStyle(status: string | null) {
  const s = (status || "scheduled").trim().toLowerCase()

  if (s === "complete") {
    return {
      label: "Complete",
      bg: "#dcfce7",
      border: "#22c55e",
      text: "#166534",
    }
  }

  if (s === "in_progress") {
    return {
      label: "In Progress",
      bg: "#dbeafe",
      border: "#3b82f6",
      text: "#1d4ed8",
    }
  }

  if (s === "skipped") {
    return {
      label: "Skipped",
      bg: "#f3f4f6",
      border: "#6b7280",
      text: "#374151",
    }
  }

  return {
    label: "Scheduled",
    bg: "#fef3c7",
    border: "#f59e0b",
    text: "#92400e",
  }
}

function AddUserPanel({ refresh }: { refresh: () => void }) {
  const [name, setName] = useState("")
  const [pin, setPin] = useState("")
  const [role, setRole] = useState("tech")
  const [saving, setSaving] = useState(false)

  async function addUser() {
    if (!name.trim() || !pin.trim()) {
      alert("Enter name and PIN")
      return
    }

    try {
      setSaving(true)

      const { error } = await supabase.from("app_users").insert({
        name: name.trim(),
        pin: pin.trim(),
        role,
        active: true,
      })

      if (error) {
        alert(error.message)
        return
      }

      alert("User added")
      setName("")
      setPin("")
      setRole("tech")
      refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 22,
        padding: 28,
        boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
        marginBottom: 24,
      }}
    >
      <div
        style={{
          fontSize: 30,
          fontWeight: 800,
          color: "#2a37d6",
          marginBottom: 18,
        }}
      >
        Add Tech / Office User
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          style={inputStyle}
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={inputStyle}
        >
          <option value="tech">Tech</option>
          <option value="office">Office</option>
        </select>

        <button
          onClick={addUser}
          disabled={saving}
          style={primaryButtonStyle}
        >
          {saving ? "Adding..." : "Add User"}
        </button>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 18,
  borderRadius: 16,
  border: "2px solid #9bb4df",
  fontSize: 20,
  color: "#111827",
  background: "#f8fbff",
  boxSizing: "border-box",
}

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: 18,
  borderRadius: 16,
  border: "none",
  fontSize: 20,
  fontWeight: 800,
  background: "#2563eb",
  color: "#ffffff",
  cursor: "pointer",
  boxShadow: "0 6px 16px rgba(37,99,235,0.25)",
}

export default function OfficeReportsPage() {
  const router = useRouter()

  const [user, setUser] = useState<AppUser | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const [reports, setReports] = useState<ReportWithMedia[]>([])
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [techUsers, setTechUsers] = useState<AppUser[]>([])

  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)

  const [address, setAddress] = useState("")
  const [techName, setTechName] = useState("")
  const [serviceDate, setServiceDate] = useState("")
  const [job, setJob] = useState("")
  const [assignmentNotes, setAssignmentNotes] = useState("")
  const [savingAssignment, setSavingAssignment] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem("user")

    if (!raw) {
      router.replace("/login")
      return
    }

    try {
      const parsed = JSON.parse(raw) as AppUser

      if (!parsed || !parsed.id || !parsed.role || !parsed.active) {
        localStorage.removeItem("user")
        router.replace("/login")
        return
      }

      if (parsed.role === "tech") {
        setUser(parsed)
        setCheckingAuth(false)
        router.replace("/report")
        return
      }

      if (parsed.role !== "office") {
        localStorage.removeItem("user")
        router.replace("/login")
        return
      }

      setUser(parsed)
      setCheckingAuth(false)
      loadOfficeData()

      const reportsChannel = supabase
        .channel("office-field-reports-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "field_reports" },
          () => loadOfficeData()
        )
        .subscribe()

      const mediaChannel = supabase
        .channel("office-field-report-media-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "field_report_media" },
          () => loadOfficeData()
        )
        .subscribe()

      const problemTypesChannel = supabase
        .channel("office-problem-types-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "problem_types" },
          () => loadOfficeData()
        )
        .subscribe()

      const assignmentsChannel = supabase
        .channel("office-assignments-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "assignments" },
          () => loadOfficeData()
        )
        .subscribe()

      const usersChannel = supabase
        .channel("office-app-users-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "app_users" },
          () => loadOfficeData()
        )
        .subscribe()

      return () => {
        supabase.removeChannel(reportsChannel)
        supabase.removeChannel(mediaChannel)
        supabase.removeChannel(problemTypesChannel)
        supabase.removeChannel(assignmentsChannel)
        supabase.removeChannel(usersChannel)
      }
    } catch {
      localStorage.removeItem("user")
      router.replace("/login")
    }
  }, [router])

  async function loadOfficeData() {
    setLoading(true)

    const [
      reportsRes,
      mediaRes,
      problemTypesRes,
      assignmentsRes,
      usersRes,
    ] = await Promise.all([
      supabase.from("field_reports").select("*").order("created_at", { ascending: false }),
      supabase.from("field_report_media").select("*").order("id", { ascending: false }),
      supabase.from("problem_types").select("label, estimated_cost"),
      supabase.from("assignments").select("*").order("service_date", { ascending: true }).order("created_at", { ascending: false }),
      supabase.from("app_users").select("*").eq("active", true).order("name", { ascending: true }),
    ])

    const reportsError = reportsRes.error
    const mediaError = mediaRes.error
    const problemTypeError = problemTypesRes.error
    const assignmentsError = assignmentsRes.error
    const usersError = usersRes.error

    if (reportsError) {
      console.error("Reports load error:", reportsError)
      alert("Could not load field reports")
      setLoading(false)
      return
    }

    if (mediaError) {
      console.error("Media load error:", mediaError)
      alert("Could not load field report photos")
      setLoading(false)
      return
    }

    if (problemTypeError) {
      console.error("Problem types load error:", problemTypeError)
      alert("Could not load problem settings")
      setLoading(false)
      return
    }

    if (assignmentsError) {
      console.error("Assignments load error:", assignmentsError)
      alert("Could not load assignments")
      setLoading(false)
      return
    }

    if (usersError) {
      console.error("Users load error:", usersError)
      alert("Could not load users")
      setLoading(false)
      return
    }

    const reportsData = reportsRes.data || []
    const mediaData = mediaRes.data || []
    const problemTypeData = problemTypesRes.data || []
    const assignmentsData = assignmentsRes.data || []
    const usersData = usersRes.data || []

    const costMap = new Map<string, number>()

    ;(problemTypeData as ProblemTypeRow[]).forEach((row) => {
      costMap.set(
        (row.label || "").trim().toLowerCase(),
        Number(row.estimated_cost || 0)
      )
    })

    const combined: ReportWithMedia[] = (reportsData as FieldReportRow[]).map((report) => {
      const key = (report.problem || "").trim().toLowerCase()
      const estimatedCost = costMap.get(key) || 0

      return {
        ...report,
        media: (mediaData as FieldReportMediaRow[]).filter((m) => m.report_id === report.id),
        estimated_cost: estimatedCost,
      }
    })

    setReports(combined)
    setAssignments(assignmentsData as AssignmentRow[])
    setTechUsers(
      (usersData as AppUser[]).filter((u) => u.role === "tech" && u.active)
    )

    setLoading(false)
  }

  async function addAssignment() {
    if (!address.trim()) {
      alert("Enter address")
      return
    }

    if (!techName.trim()) {
      alert("Pick a tech")
      return
    }

    if (!serviceDate) {
      alert("Pick a date")
      return
    }

    if (!job.trim()) {
      alert("Enter job")
      return
    }

    try {
      setSavingAssignment(true)

      const { error } = await supabase.from("assignments").insert({
        address: address.trim(),
        tech_name: techName.trim(),
        service_date: serviceDate,
        job: job.trim(),
        notes: assignmentNotes.trim(),
        status: "scheduled",
      })

      if (error) {
        alert(error.message)
        return
      }

      setAddress("")
      setTechName("")
      setServiceDate("")
      setJob("")
      setAssignmentNotes("")
      await loadOfficeData()
      alert("Assignment added")
    } finally {
      setSavingAssignment(false)
    }
  }

  async function deleteAssignment(id: string) {
    const ok = window.confirm("Delete this assignment?")
    if (!ok) return

    const { error } = await supabase.from("assignments").delete().eq("id", id)

    if (error) {
      alert("Could not delete assignment")
      console.error(error)
      return
    }

    loadOfficeData()
  }

  async function updateAssignmentStatus(id: string, status: string) {
    const { error } = await supabase
      .from("assignments")
      .update({ status })
      .eq("id", id)

    if (error) {
      alert("Could not update assignment status")
      console.error(error)
      return
    }

    loadOfficeData()
  }

  async function updateStatus(reportId: string, status: string) {
    const { error } = await supabase
      .from("field_reports")
      .update({ status })
      .eq("id", reportId)

    if (error) {
      alert("Could not update status")
      console.error(error)
      return
    }

    loadOfficeData()
  }

  function logout() {
    localStorage.removeItem("user")
    router.replace("/login")
  }

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const text = `${a.address || ""} ${a.tech_name || ""} ${a.service_date || ""} ${a.job || ""} ${a.notes || ""} ${a.status || ""}`
      return text.toLowerCase().includes(search.toLowerCase())
    })
  }, [assignments, search])

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const text = `${r.address || ""} ${r.problem || ""} ${r.priority || ""} ${r.notes || ""} ${r.submitted_by || ""} ${r.status || ""}`
      return text.toLowerCase().includes(search.toLowerCase())
    })
  }, [reports, search])

  if (checkingAuth) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#bcc9d8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            padding: 24,
            borderRadius: 16,
            fontSize: 22,
            fontWeight: 700,
            color: "#2a37d6",
          }}
        >
          Loading...
        </div>
      </main>
    )
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#bcc9d8",
        fontFamily: "Arial",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: 22,
            padding: 28,
            boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 18,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 54,
                  lineHeight: 1,
                  color: "#2a37d6",
                  fontWeight: 800,
                }}
              >
                Office Reports
              </h1>

              <div
                style={{
                  marginTop: 12,
                  fontSize: 22,
                  color: "#4b5563",
                  fontWeight: 500,
                }}
              >
                Assign jobs, manage reports, and track tech work
              </div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 16,
                  color: loading ? "#b45309" : "#15803d",
                  fontWeight: 700,
                }}
              >
                {loading ? "Updating..." : `Logged in as: ${user?.name} (${user?.role})`}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={loadOfficeData}
                style={{
                  background: "#3d7be0",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 18,
                  padding: "20px 28px",
                  fontSize: 20,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 6px 16px rgba(61,123,224,0.25)",
                }}
              >
                Refresh
              </button>

              <button
                onClick={logout}
                style={{
                  background: "#6b7280",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 18,
                  padding: "20px 28px",
                  fontSize: 20,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            </div>
          </div>

          <input
            placeholder="Search assignments or reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              marginTop: 24,
              padding: 22,
              borderRadius: 20,
              border: "2px solid #9bb4df",
              fontSize: 20,
              color: "#111827",
              outline: "none",
              background: "#f8fbff",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div
          style={{
            background: "#ffffff",
            borderRadius: 22,
            padding: 28,
            boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: "#2a37d6",
              marginBottom: 18,
            }}
          >
            Add Assignment
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
              marginBottom: 14,
            }}
          >
            <input
              placeholder="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={inputStyle}
            />

            <select
              value={techName}
              onChange={(e) => setTechName(e.target.value)}
              style={inputStyle}
            >
              <option value="">Pick Tech</option>
              {techUsers.map((tech) => (
                <option key={tech.id} value={tech.name}>
                  {tech.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              style={inputStyle}
            />

            <input
              placeholder="Job"
              value={job}
              onChange={(e) => setJob(e.target.value)}
              style={inputStyle}
            />
          </div>

          <textarea
            placeholder="Notes (optional)"
            value={assignmentNotes}
            onChange={(e) => setAssignmentNotes(e.target.value)}
            style={{
              ...inputStyle,
              minHeight: 110,
              resize: "vertical",
              marginBottom: 14,
            }}
          />

          <button
            onClick={addAssignment}
            disabled={savingAssignment}
            style={{
              ...primaryButtonStyle,
              maxWidth: 280,
              opacity: savingAssignment ? 0.8 : 1,
              cursor: savingAssignment ? "not-allowed" : "pointer",
            }}
          >
            {savingAssignment ? "Adding..." : "Add Assignment"}
          </button>
        </div>

        <AddUserPanel refresh={loadOfficeData} />

        <div
          style={{
            background: "#ffffff",
            borderRadius: 22,
            padding: 28,
            boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: "#2a37d6",
              marginBottom: 18,
            }}
          >
            Assignments
          </div>

          {filteredAssignments.length === 0 ? (
            <div
              style={{
                fontSize: 22,
                color: "#4b5563",
                fontWeight: 600,
              }}
            >
              No assignments found
            </div>
          ) : (
            filteredAssignments.map((a) => {
              const statusStyle = getAssignmentStatusStyle(a.status)

              return (
                <div
                  key={a.id}
                  style={{
                    border: "1px solid #d9e5f4",
                    borderRadius: 18,
                    padding: 20,
                    marginBottom: 16,
                    background: "#f9fbfe",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 18,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 280 }}>
                      <div
                        style={{
                          fontSize: 28,
                          color: "#2a37d6",
                          fontWeight: 800,
                          marginBottom: 10,
                        }}
                      >
                        {a.address || "No address"}
                      </div>

                      <div style={{ fontSize: 18, color: "#111827", fontWeight: 700, marginBottom: 8 }}>
                        Tech: <span style={{ fontWeight: 500 }}>{a.tech_name || "Not set"}</span>
                      </div>

                      <div style={{ fontSize: 18, color: "#111827", fontWeight: 700, marginBottom: 8 }}>
                        Date: <span style={{ fontWeight: 500 }}>{formatDateOnly(a.service_date)}</span>
                      </div>

                      <div style={{ fontSize: 18, color: "#111827", fontWeight: 700, marginBottom: 8 }}>
                        Job: <span style={{ fontWeight: 500 }}>{a.job || "Not set"}</span>
                      </div>

                      <div style={{ fontSize: 18, color: "#111827", fontWeight: 700, marginBottom: 8 }}>
                        Notes: <span style={{ fontWeight: 500 }}>{a.notes?.trim() ? a.notes : "None"}</span>
                      </div>

                      <div
                        style={{
                          display: "inline-block",
                          background: statusStyle.bg,
                          border: `2px solid ${statusStyle.border}`,
                          color: statusStyle.text,
                          borderRadius: 999,
                          padding: "8px 14px",
                          fontSize: 16,
                          fontWeight: 800,
                          marginTop: 6,
                        }}
                      >
                        {statusStyle.label}
                      </div>
                    </div>

                    <div
                      style={{
                        minWidth: 260,
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      <select
                        value={a.status || "scheduled"}
                        onChange={(e) => updateAssignmentStatus(a.id, e.target.value)}
                        style={inputStyle}
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="in_progress">In Progress</option>
                        <option value="complete">Complete</option>
                        <option value="skipped">Skipped</option>
                      </select>

                      <button
                        onClick={() => deleteAssignment(a.id)}
                        style={{
                          ...primaryButtonStyle,
                          background: "#dc2626",
                          boxShadow: "0 6px 16px rgba(220,38,38,0.25)",
                        }}
                      >
                        Delete Assignment
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div
          style={{
            fontSize: 34,
            fontWeight: 800,
            color: "#2a37d6",
            marginBottom: 18,
          }}
        >
          Field Reports
        </div>

        {filteredReports.length === 0 ? (
          <div
            style={{
              background: "#ffffff",
              borderRadius: 22,
              padding: 28,
              boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
              fontSize: 22,
              color: "#4b5563",
              fontWeight: 600,
            }}
          >
            No reports found
          </div>
        ) : (
          filteredReports.map((r) => {
            const priorityStyle = getPriorityStyle(r.priority)
            const statusStyle = getStatusStyle(r.status)

            return (
              <div
                key={r.id}
                style={{
                  background: "#ffffff",
                  borderRadius: 22,
                  padding: 28,
                  boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
                  marginBottom: 24,
                  border: "1px solid #d9e5f4",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 20,
                    flexWrap: "wrap",
                    marginBottom: 18,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <h2
                      style={{
                        margin: 0,
                        color: "#2a37d6",
                        fontSize: 34,
                        lineHeight: 1.1,
                        fontWeight: 800,
                      }}
                    >
                      {r.address || "No address"}
                    </h2>

                    <div
                      style={{
                        marginTop: 16,
                        fontSize: 20,
                        color: "#111827",
                        fontWeight: 800,
                      }}
                    >
                      Problem:{" "}
                      <span style={{ fontWeight: 700 }}>
                        {r.problem || "Not set"}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          display: "inline-block",
                          background: priorityStyle.bg,
                          border: `2px solid ${priorityStyle.border}`,
                          color: priorityStyle.text,
                          borderRadius: 999,
                          padding: "8px 14px",
                          fontSize: 16,
                          fontWeight: 800,
                        }}
                      >
                        {priorityStyle.label}
                      </div>

                      <div
                        style={{
                          display: "inline-block",
                          background: statusStyle.bg,
                          border: `2px solid ${statusStyle.border}`,
                          color: statusStyle.text,
                          borderRadius: 999,
                          padding: "8px 14px",
                          fontSize: 16,
                          fontWeight: 800,
                        }}
                      >
                        {statusStyle.label}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        fontSize: 18,
                        color: "#4b5563",
                        fontWeight: 500,
                      }}
                    >
                      Submitted: {formatDate(r.created_at)}
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 18,
                        color: "#4b5563",
                        fontWeight: 700,
                      }}
                    >
                      Submitted by: {r.submitted_by || "Unknown"}
                    </div>
                  </div>

                  <div
                    style={{
                      minWidth: 320,
                      background: "#f6faff",
                      border: "1px solid #cfe0f8",
                      borderRadius: 18,
                      padding: 20,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 16,
                        color: "#4b5563",
                        fontWeight: 700,
                        marginBottom: 12,
                      }}
                    >
                      Report Info
                    </div>

                    <div
                      style={{
                        fontSize: 18,
                        color: "#111827",
                        fontWeight: 700,
                        marginBottom: 12,
                      }}
                    >
                      Photos:{" "}
                      <span style={{ fontWeight: 600 }}>{r.media.length}</span>
                    </div>

                    <div
                      style={{
                        fontSize: 18,
                        color: "#111827",
                        fontWeight: 700,
                        marginBottom: 12,
                      }}
                    >
                      Estimated Cost:{" "}
                      <span style={{ color: "#0f766e", fontWeight: 800 }}>
                        {formatMoney(r.estimated_cost)}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: 18,
                        color: "#111827",
                        fontWeight: 700,
                        marginBottom: 12,
                      }}
                    >
                      Status
                    </div>

                    <select
                      value={r.status || "open"}
                      onChange={(e) => updateStatus(r.id, e.target.value)}
                      style={{
                        width: "100%",
                        padding: 14,
                        borderRadius: 12,
                        border: "2px solid #9bb4df",
                        fontSize: 18,
                        color: "#111827",
                        background: "#ffffff",
                        boxSizing: "border-box",
                        marginBottom: 12,
                      }}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>

                    <div
                      style={{
                        fontSize: 18,
                        color: "#111827",
                        fontWeight: 700,
                        wordBreak: "break-word",
                      }}
                    >
                      Report ID: <span style={{ fontWeight: 500 }}>{r.id}</span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid #d9e5f4",
                    borderRadius: 18,
                    padding: 22,
                    marginBottom: 22,
                    background: "#f9fbfe",
                  }}
                >
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: "#2a37d6",
                      marginBottom: 14,
                    }}
                  >
                    Notes
                  </div>

                  <div
                    style={{
                      fontSize: 22,
                      lineHeight: 1.45,
                      color: "#111827",
                      fontWeight: 500,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {r.notes && r.notes.trim() ? r.notes : "No notes"}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: "#2a37d6",
                    marginBottom: 14,
                  }}
                >
                  Photos ({r.media.length})
                </div>

                {r.media.length === 0 ? (
                  <div
                    style={{
                      border: "1px solid #d9e5f4",
                      borderRadius: 18,
                      padding: 22,
                      color: "#6b7280",
                      fontSize: 20,
                      fontWeight: 600,
                      background: "#f9fbfe",
                    }}
                  >
                    No photos for this report
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    {r.media.map((m, i) => (
                      <a
                        key={i}
                        href={m.file_url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          textDecoration: "none",
                          display: "block",
                        }}
                      >
                        <div
                          style={{
                            width: 190,
                            background: "#f8fbff",
                            border: "1px solid #d9e5f4",
                            borderRadius: 16,
                            overflow: "hidden",
                            boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
                          }}
                        >
                          <img
                            src={m.file_url || ""}
                            alt={m.file_name || `Photo ${i + 1}`}
                            style={{
                              width: "100%",
                              height: 190,
                              objectFit: "cover",
                              display: "block",
                              background: "#eef4fb",
                            }}
                          />

                          <div
                            style={{
                              padding: 10,
                              fontSize: 14,
                              color: "#4b5563",
                              fontWeight: 600,
                              wordBreak: "break-word",
                            }}
                          >
                            {m.file_name || `Photo ${i + 1}`}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </main>
  )
}