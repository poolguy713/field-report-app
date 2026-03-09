"use client"

import { useEffect, useState } from "react"
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

function formatDate(value: string | null) {
  if (!value) return "No date"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString()
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
          style={{
            width: "100%",
            padding: 18,
            borderRadius: 16,
            border: "2px solid #9bb4df",
            fontSize: 20,
            color: "#111827",
            background: "#f8fbff",
            boxSizing: "border-box",
          }}
        />

        <input
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          style={{
            width: "100%",
            padding: 18,
            borderRadius: 16,
            border: "2px solid #9bb4df",
            fontSize: 20,
            color: "#111827",
            background: "#f8fbff",
            boxSizing: "border-box",
          }}
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{
            width: "100%",
            padding: 18,
            borderRadius: 16,
            border: "2px solid #9bb4df",
            fontSize: 20,
            color: "#111827",
            background: "#f8fbff",
            boxSizing: "border-box",
          }}
        >
          <option value="tech">Tech</option>
          <option value="office">Office</option>
        </select>

        <button
          onClick={addUser}
          disabled={saving}
          style={{
            width: "100%",
            padding: 18,
            borderRadius: 16,
            border: "none",
            fontSize: 20,
            fontWeight: 800,
            background: "#2563eb",
            color: "#ffffff",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.8 : 1,
            boxShadow: "0 6px 16px rgba(37,99,235,0.25)",
          }}
        >
          {saving ? "Adding..." : "Add User"}
        </button>
      </div>
    </div>
  )
}

export default function OfficeReportsPage() {
  const router = useRouter()

  const [user, setUser] = useState<AppUser | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const [reports, setReports] = useState<ReportWithMedia[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)

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
          {
            event: "*",
            schema: "public",
            table: "field_reports",
          },
          () => {
            loadOfficeData()
          }
        )
        .subscribe()

      const mediaChannel = supabase
        .channel("office-field-report-media-live")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "field_report_media",
          },
          () => {
            loadOfficeData()
          }
        )
        .subscribe()

      const problemTypesChannel = supabase
        .channel("office-problem-types-live")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "problem_types",
          },
          () => {
            loadOfficeData()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(reportsChannel)
        supabase.removeChannel(mediaChannel)
        supabase.removeChannel(problemTypesChannel)
      }
    } catch {
      localStorage.removeItem("user")
      router.replace("/login")
    }
  }, [router])

  async function loadOfficeData() {
    setLoading(true)

    const { data: reportsData, error: reportsError } = await supabase
      .from("field_reports")
      .select("*")
      .order("created_at", { ascending: false })

    const { data: mediaData, error: mediaError } = await supabase
      .from("field_report_media")
      .select("*")
      .order("id", { ascending: false })

    const { data: problemTypeData, error: problemTypeError } = await supabase
      .from("problem_types")
      .select("label, estimated_cost")

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

    const costMap = new Map<string, number>()

    ;((problemTypeData as ProblemTypeRow[]) || []).forEach((row) => {
      costMap.set(
        (row.label || "").trim().toLowerCase(),
        Number(row.estimated_cost || 0)
      )
    })

    const combined: ReportWithMedia[] = (
      (reportsData as FieldReportRow[]) || []
    ).map((report) => {
      const key = (report.problem || "").trim().toLowerCase()
      const estimatedCost = costMap.get(key) || 0

      return {
        ...report,
        media: ((mediaData as FieldReportMediaRow[]) || []).filter(
          (m) => m.report_id === report.id
        ),
        estimated_cost: estimatedCost,
      }
    })

    setReports(combined)
    setLoading(false)
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

  const filteredReports = reports.filter((r) => {
    const text =
      `${r.address || ""} ${r.problem || ""} ${r.priority || ""} ${r.notes || ""} ${r.submitted_by || ""} ${r.status || ""}`
    return text.toLowerCase().includes(search.toLowerCase())
  })

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
                Live field reports from tech submissions
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
            placeholder="Search address, problem, notes, priority, tech, status..."
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

        <AddUserPanel refresh={loadOfficeData} />

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