"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"

type AddressRow = {
  id: string
  label: string
}

type AppUser = {
  id: string
  name: string
  pin: string
  role: "tech" | "office"
  active: boolean
}

type MyReportRow = {
  id: string
  address: string | null
  problem: string | null
  priority: string | null
  notes: string | null
  submitted_by: string | null
  status: string | null
  created_at: string | null
}

type ReportPhotoRow = {
  file_url: string | null
  file_name: string | null
  file_type: string | null
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

function ReportPhotos({ reportId }: { reportId: string }) {
  const [photos, setPhotos] = useState<ReportPhotoRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPhotos()
  }, [reportId])

  async function loadPhotos() {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("field_report_media")
        .select("file_url,file_name,file_type")
        .eq("report_id", reportId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Photo load error:", error)
        return
      }

      setPhotos((data as ReportPhotoRow[]) || [])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div
        style={{
          marginTop: 12,
          color: "#6b7280",
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        Loading photos...
      </div>
    )
  }

  if (!photos.length) return null

  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: "#4b5563",
          marginBottom: 10,
        }}
      >
        Photos
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        {photos.map((photo, index) => (
          <a
            key={`${photo.file_url || "photo"}-${index}`}
            href={photo.file_url || "#"}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: "none" }}
          >
            <img
              src={photo.file_url || ""}
              alt={photo.file_name || `Report photo ${index + 1}`}
              style={{
                width: 140,
                height: 140,
                objectFit: "cover",
                borderRadius: 12,
                border: "2px solid #d9e5f4",
                background: "#f3f4f6",
                display: "block",
              }}
            />
          </a>
        ))}
      </div>
    </div>
  )
}

function getTodayLocalDate() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
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

export default function ReportPage() {
  const router = useRouter()

  const [user, setUser] = useState<AppUser | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const [addresses, setAddresses] = useState<AddressRow[]>([])
  const [addressInput, setAddressInput] = useState("")
  const [selectedAddress, setSelectedAddress] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [problem, setProblem] = useState("")
  const [priority, setPriority] = useState("normal")
  const [notes, setNotes] = useState("")
  const [photos, setPhotos] = useState<File[]>([])
  const [saving, setSaving] = useState(false)

  const [showMyReports, setShowMyReports] = useState(false)
  const [myReports, setMyReports] = useState<MyReportRow[]>([])
  const [loadingMyReports, setLoadingMyReports] = useState(false)

  const [routeDate, setRouteDate] = useState(getTodayLocalDate())
  const [routeAssignments, setRouteAssignments] = useState<AssignmentRow[]>([])
  const [loadingRoute, setLoadingRoute] = useState(false)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("")

  const addressBoxRef = useRef<HTMLDivElement | null>(null)

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

      if (parsed.role === "office") {
        setUser(parsed)
        setCheckingAuth(false)
        router.replace("/office")
        return
      }

      if (parsed.role !== "tech") {
        localStorage.removeItem("user")
        router.replace("/login")
        return
      }

      setUser(parsed)
      setCheckingAuth(false)
      loadData()
      loadRouteAssignments(parsed.name, getTodayLocalDate())

      const assignmentsChannel = supabase
        .channel("tech-assignments-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "assignments" },
          () => loadRouteAssignments(parsed.name, routeDate || getTodayLocalDate())
        )
        .subscribe()

      return () => {
        supabase.removeChannel(assignmentsChannel)
      }
    } catch {
      localStorage.removeItem("user")
      router.replace("/login")
    }
  }, [router])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        addressBoxRef.current &&
        !addressBoxRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  async function loadData() {
    const { data: addr } = await supabase
      .from("addresses")
      .select("id,label")
      .order("label", { ascending: true })

    setAddresses(addr || [])
  }

  async function loadRouteAssignments(techName: string, dateValue: string) {
    const cleanTech = (techName || "").trim()
    const cleanDate = (dateValue || "").trim()

    if (!cleanTech || !cleanDate) {
      setRouteAssignments([])
      return
    }

    try {
      setLoadingRoute(true)

      const { data, error } = await supabase
        .from("assignments")
        .select("*")
        .eq("tech_name", cleanTech)
        .eq("service_date", cleanDate)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Route load error:", error)
        return
      }

      setRouteAssignments((data as AssignmentRow[]) || [])
    } finally {
      setLoadingRoute(false)
    }
  }

  async function loadMyReports(userName?: string) {
    const techName = (userName || user?.name || "").trim()
    if (!techName) return

    try {
      setLoadingMyReports(true)

      const { data, error } = await supabase
        .from("field_reports")
        .select("id,address,problem,priority,notes,submitted_by,status,created_at")
        .eq("submitted_by", techName)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("My reports load error:", error)
        alert("Could not load your reports")
        return
      }

      setMyReports((data as MyReportRow[]) || [])
    } finally {
      setLoadingMyReports(false)
    }
  }

  async function toggleMyReports() {
    if (showMyReports) {
      setShowMyReports(false)
      return
    }

    setShowMyReports(true)
    await loadMyReports()
  }

  const filteredAddresses = useMemo(() => {
    const q = addressInput.trim().toLowerCase()

    if (!q) return addresses.slice(0, 8)

    return addresses
      .filter((a) => a.label.toLowerCase().includes(q))
      .slice(0, 8)
  }, [addresses, addressInput])

  function addPhotos(files: FileList | null) {
    if (!files) return
    const list = Array.from(files)
    setPhotos((prev) => [...prev, ...list])
  }

  function pickAddress(label: string) {
    setAddressInput(label)
    setSelectedAddress(label)
    setShowSuggestions(false)
  }

  function chooseAssignment(assignmentId: string) {
    setSelectedAssignmentId(assignmentId)

    const picked = routeAssignments.find((a) => a.id === assignmentId)
    if (!picked) return

    const pickedAddress = picked.address || ""
    setAddressInput(pickedAddress)
    setSelectedAddress(pickedAddress)
    setShowSuggestions(false)

    if (!problem.trim() && picked.job?.trim()) {
      setProblem(picked.job.trim())
    }

    if (!notes.trim() && picked.notes?.trim()) {
      setNotes(picked.notes.trim())
    }
  }

  async function getFinalAddress() {
    const typed = addressInput.trim()
    if (!typed) return ""

    const existingExact = addresses.find(
      (a) => a.label.trim().toLowerCase() === typed.toLowerCase()
    )

    if (existingExact) {
      return existingExact.label
    }

    const { data: existingDb } = await supabase
      .from("addresses")
      .select("id,label")
      .ilike("label", typed)
      .limit(1)

    if (!existingDb || existingDb.length === 0) {
      await supabase.from("addresses").insert([{ label: typed }])
    }

    return typed
  }

  async function submitReport() {
    if (!user) {
      alert("Login required")
      router.replace("/login")
      return
    }

    if (user.role !== "tech") {
      alert("Tech login required")
      router.replace("/login")
      return
    }

    const finalAddress = await getFinalAddress()

    if (!finalAddress) {
      alert("Type or choose an address")
      return
    }

    if (!problem.trim()) {
      alert("Type the problem")
      return
    }

    try {
      setSaving(true)

      const { data: reportRow, error: reportError } = await supabase
        .from("field_reports")
        .insert([
          {
            address: finalAddress,
            problem: problem.trim(),
            priority,
            notes,
            submitted_by: user.name,
            status: "open",
          },
        ])
        .select()
        .single()

      if (reportError || !reportRow) {
        alert("Report save failed")
        console.error(reportError)
        return
      }

      const reportId = reportRow.id

      for (const photo of photos) {
        const path = `${reportId}/${Date.now()}-${photo.name}`

        const { error: uploadError } = await supabase.storage
          .from("field-report-media")
          .upload(path, photo)

        if (uploadError) {
          console.error("UPLOAD ERROR:", uploadError)
          alert("Photo upload failed: " + (uploadError.message || "unknown error"))
          continue
        }

        const { data: urlData } = supabase.storage
          .from("field-report-media")
          .getPublicUrl(path)

        const { error: mediaInsertError } = await supabase
          .from("field_report_media")
          .insert([
            {
              report_id: reportId,
              file_url: urlData.publicUrl,
              file_name: photo.name,
              file_type: photo.type,
            },
          ])

        if (mediaInsertError) {
          console.error("MEDIA ROW INSERT ERROR:", mediaInsertError)
          alert(
            "Photo uploaded but media record save failed: " +
              (mediaInsertError.message || "unknown error")
          )
          continue
        }
      }

      if (selectedAssignmentId) {
        const { error: assignmentUpdateError } = await supabase
          .from("assignments")
          .update({ status: "complete" })
          .eq("id", selectedAssignmentId)

        if (assignmentUpdateError) {
          console.error("ASSIGNMENT STATUS UPDATE ERROR:", assignmentUpdateError)
        }
      }

      alert("Report submitted")

      setAddressInput("")
      setSelectedAddress("")
      setShowSuggestions(false)
      setProblem("")
      setPriority("normal")
      setNotes("")
      setPhotos([])
      setSelectedAssignmentId("")

      await loadData()
      await loadRouteAssignments(user.name, routeDate)
      setShowMyReports(true)
      await loadMyReports(user.name)
    } catch (err: any) {
      console.error("SUBMIT CRASH:", err)
      alert("Submit crashed: " + (err?.message || "unknown error"))
    } finally {
      setSaving(false)
    }
  }

  function logout() {
    localStorage.removeItem("user")
    router.replace("/login")
  }

  function chipStyle(value: string) {
    const selected = priority === value

    if (value === "urgent") {
      return {
        background: selected ? "#fee2e2" : "#ffffff",
        border: selected ? "2px solid #ef4444" : "2px solid #fecaca",
        color: "#991b1b",
      }
    }

    if (value === "low") {
      return {
        background: selected ? "#dcfce7" : "#ffffff",
        border: selected ? "2px solid #22c55e" : "2px solid #bbf7d0",
        color: "#166534",
      }
    }

    return {
      background: selected ? "#fef3c7" : "#ffffff",
      border: selected ? "2px solid #f59e0b" : "2px solid #fde68a",
      color: "#92400e",
    }
  }

  function statusStyle(status: string | null) {
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

  function priorityBadge(priorityValue: string | null) {
    const p = (priorityValue || "normal").trim().toLowerCase()

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
        color: "#111827",
      }}
    >
      <div
        style={{
          maxWidth: 700,
          margin: "auto",
          background: "#ffffff",
          padding: 28,
          borderRadius: 18,
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 18,
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#2a37d6",
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            Field Report
          </h2>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={toggleMyReports}
              style={{
                background: "#3d7be0",
                color: "#ffffff",
                border: "none",
                padding: "12px 18px",
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 18,
                cursor: "pointer",
              }}
            >
              {showMyReports ? "Hide My Reports" : "My Reports"}
            </button>

            <button
              onClick={logout}
              style={{
                background: "#6b7280",
                color: "#ffffff",
                border: "none",
                padding: "12px 18px",
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 18,
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        </div>

        <div
          style={{
            marginBottom: 24,
            color: "#4b5563",
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          Logged in as: {user?.name} ({user?.role})
        </div>

        <div
          style={{
            marginBottom: 28,
            background: "#f8fbff",
            border: "1px solid #d9e5f4",
            borderRadius: 18,
            padding: 20,
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "#2a37d6",
              marginBottom: 16,
            }}
          >
            My Route
          </div>

          <label
            style={{
              display: "block",
              fontSize: 17,
              fontWeight: 700,
              marginBottom: 8,
              color: "#111827",
            }}
          >
            Route Date
          </label>

          <input
            type="date"
            value={routeDate}
            onChange={async (e) => {
              const nextDate = e.target.value
              setRouteDate(nextDate)
              setSelectedAssignmentId("")
              await loadRouteAssignments(user?.name || "", nextDate)
            }}
            style={{
              width: "100%",
              padding: 16,
              borderRadius: 12,
              border: "3px solid #2a37d6",
              fontSize: 18,
              background: "#ffffff",
              color: "#111827",
              boxSizing: "border-box",
              marginBottom: 16,
            }}
          />

          <label
            style={{
              display: "block",
              fontSize: 17,
              fontWeight: 700,
              marginBottom: 8,
              color: "#111827",
            }}
          >
            Route Stop
          </label>

          <select
            value={selectedAssignmentId}
            onChange={(e) => chooseAssignment(e.target.value)}
            style={{
              width: "100%",
              padding: 16,
              borderRadius: 12,
              border: "3px solid #2a37d6",
              fontSize: 18,
              background: "#ffffff",
              color: "#111827",
              boxSizing: "border-box",
            }}
          >
            <option value="">Pick an assigned address</option>
            {routeAssignments.map((a) => (
              <option key={a.id} value={a.id}>
                {(a.address || "No address")} - {(a.job || "No job")}
              </option>
            ))}
          </select>

          <div
            style={{
              marginTop: 12,
              color: "#4b5563",
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            {loadingRoute
              ? "Loading route..."
              : routeAssignments.length === 0
              ? `No route stops for ${formatDateOnly(routeDate)}`
              : `${routeAssignments.length} stop(s) for ${formatDateOnly(routeDate)}`}
          </div>

          {selectedAssignmentId && (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 12,
                border: "1px solid #d9e5f4",
                background: "#ffffff",
              }}
            >
              {routeAssignments
                .filter((a) => a.id === selectedAssignmentId)
                .map((a) => (
                  <div key={a.id}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 6 }}>
                      Address: <span style={{ fontWeight: 600 }}>{a.address || "No address"}</span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 6 }}>
                      Job: <span style={{ fontWeight: 600 }}>{a.job || "No job"}</span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>
                      Office Notes: <span style={{ fontWeight: 600 }}>{a.notes?.trim() ? a.notes : "None"}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {showMyReports && (
          <div
            style={{
              marginBottom: 28,
              background: "#f8fbff",
              border: "1px solid #d9e5f4",
              borderRadius: 18,
              padding: 20,
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#2a37d6",
                marginBottom: 18,
              }}
            >
              My Reports
            </div>

            {loadingMyReports ? (
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #d9e5f4",
                  borderRadius: 16,
                  padding: 18,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#4b5563",
                }}
              >
                Loading my reports...
              </div>
            ) : myReports.length === 0 ? (
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #d9e5f4",
                  borderRadius: 16,
                  padding: 18,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#4b5563",
                }}
              >
                No reports yet.
              </div>
            ) : (
              myReports.map((r) => {
                const p = priorityBadge(r.priority)
                const s = statusStyle(r.status)

                return (
                  <div
                    key={r.id}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #d9e5f4",
                      borderRadius: 16,
                      padding: 18,
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 800,
                        color: "#2a37d6",
                        marginBottom: 10,
                      }}
                    >
                      {r.address || "No address"}
                    </div>

                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#111827",
                        marginBottom: 12,
                      }}
                    >
                      Problem: {r.problem || "Not set"}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          background: p.bg,
                          border: `2px solid ${p.border}`,
                          color: p.text,
                          borderRadius: 999,
                          padding: "8px 14px",
                          fontSize: 15,
                          fontWeight: 800,
                        }}
                      >
                        {p.label}
                      </div>

                      <div
                        style={{
                          background: s.bg,
                          border: `2px solid ${s.border}`,
                          color: s.text,
                          borderRadius: 999,
                          padding: "8px 14px",
                          fontSize: 15,
                          fontWeight: 800,
                        }}
                      >
                        {s.label}
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: 16,
                        color: "#4b5563",
                        fontWeight: 700,
                        marginBottom: 10,
                      }}
                    >
                      Submitted: {formatDate(r.created_at)}
                    </div>

                    <div
                      style={{
                        fontSize: 17,
                        color: "#111827",
                        fontWeight: 600,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {r.notes && r.notes.trim() ? r.notes : "No notes"}
                    </div>

                    <ReportPhotos reportId={r.id} />
                  </div>
                )
              })
            )}
          </div>
        )}

        <label
          style={{
            display: "block",
            fontSize: 18,
            fontWeight: 700,
            color: "#111827",
            marginBottom: 8,
          }}
        >
          Address
        </label>

        <div
          ref={addressBoxRef}
          style={{
            position: "relative",
            marginBottom: 24,
          }}
        >
          <input
            value={addressInput}
            onChange={(e) => {
              setAddressInput(e.target.value)
              setSelectedAddress("")
              setShowSuggestions(true)
              setSelectedAssignmentId("")
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Start typing address..."
            style={{
              width: "100%",
              padding: 16,
              borderRadius: 12,
              border: "3px solid #2a37d6",
              fontSize: 18,
              background: "#ffffff",
              color: "#111827",
              boxSizing: "border-box",
            }}
          />

          {showSuggestions && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                right: 0,
                background: "#ffffff",
                border: "2px solid #c7d7f3",
                borderRadius: 14,
                boxShadow: "0 10px 22px rgba(0,0,0,0.08)",
                overflow: "hidden",
                zIndex: 20,
              }}
            >
              {filteredAddresses.length === 0 ? (
                <div
                  style={{
                    padding: 14,
                    fontSize: 16,
                    color: "#6b7280",
                    fontWeight: 600,
                  }}
                >
                  No saved match. Keep typing to save a new address.
                </div>
              ) : (
                filteredAddresses.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => pickAddress(a.label)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: "#ffffff",
                      color: "#111827",
                      border: "none",
                      borderBottom: "1px solid #e5edf8",
                      padding: "14px 16px",
                      fontSize: 17,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {a.label}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: -10,
            marginBottom: 24,
            color: selectedAddress ? "#15803d" : "#4b5563",
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          {selectedAddress
            ? `Using address: ${selectedAddress}`
            : "Type to find a saved address or pick one from your route"}
        </div>

        <label
          style={{
            display: "block",
            fontSize: 18,
            fontWeight: 700,
            color: "#111827",
            marginBottom: 8,
          }}
        >
          Problem
        </label>

        <input
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          placeholder="Type the problem here..."
          style={{
            width: "100%",
            padding: 16,
            marginBottom: 24,
            borderRadius: 12,
            border: "3px solid #2a37d6",
            fontSize: 18,
            background: "#ffffff",
            color: "#111827",
            boxSizing: "border-box",
          }}
        />

        <label
          style={{
            display: "block",
            fontSize: 18,
            fontWeight: 700,
            color: "#111827",
            marginBottom: 10,
          }}
        >
          Urgency
        </label>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          <button
            type="button"
            onClick={() => setPriority("urgent")}
            style={{
              ...chipStyle("urgent"),
              borderRadius: 999,
              padding: "10px 16px",
              fontSize: 16,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            🔴 Urgent
          </button>

          <button
            type="button"
            onClick={() => setPriority("normal")}
            style={{
              ...chipStyle("normal"),
              borderRadius: 999,
              padding: "10px 16px",
              fontSize: 16,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            🟡 Normal
          </button>

          <button
            type="button"
            onClick={() => setPriority("low")}
            style={{
              ...chipStyle("low"),
              borderRadius: 999,
              padding: "10px 16px",
              fontSize: 16,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            🟢 Low
          </button>
        </div>

        <label
          style={{
            display: "block",
            fontSize: 18,
            fontWeight: 700,
            color: "#111827",
            marginBottom: 8,
          }}
        >
          Notes
        </label>

        <textarea
          rows={6}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{
            width: "100%",
            padding: 16,
            marginBottom: 24,
            borderRadius: 12,
            border: "3px solid #2a37d6",
            fontSize: 18,
            resize: "vertical",
            background: "#ffffff",
            color: "#111827",
            boxSizing: "border-box",
          }}
        />

        <label
          style={{
            display: "block",
            fontSize: 18,
            fontWeight: 700,
            color: "#111827",
            marginBottom: 10,
          }}
        >
          Photos
        </label>

        <div style={{ marginTop: 10, marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              background: "#2317d1",
              color: "#ffffff",
              padding: 18,
              borderRadius: 12,
              textAlign: "center",
              fontWeight: 700,
              fontSize: 22,
              cursor: "pointer",
            }}
          >
            📷 Take Photo

            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              hidden
              onChange={(e) => addPhotos(e.target.files)}
            />
          </label>
        </div>

        <div
          style={{
            marginBottom: 22,
            color: "#4b5563",
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          {photos.length} photo(s) selected
        </div>

        <button
          onClick={submitReport}
          disabled={saving}
          style={{
            width: "100%",
            padding: 18,
            background: "#2317d1",
            color: "#ffffff",
            border: "none",
            borderRadius: 12,
            fontSize: 22,
            fontWeight: 800,
            cursor: "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Submitting..." : "Submit Report"}
        </button>
      </div>
    </main>
  )
}