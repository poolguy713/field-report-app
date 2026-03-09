"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"

export default function LoginPage() {
  const router = useRouter()

  const [pin, setPin] = useState("")
  const [loading, setLoading] = useState(false)

  async function login() {
    if (!pin.trim()) {
      alert("Enter PIN")
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from("app_users")
      .select("*")
      .eq("pin", pin)
      .eq("active", true)
      .limit(1)
      .single()

    if (error || !data) {
      alert("Invalid PIN")
      setLoading(false)
      return
    }

    localStorage.setItem("user", JSON.stringify(data))

    if (data.role === "office") {
      router.push("/office")
    } else {
      router.push("/report")
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#bcc9d8",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Arial",
        padding: 20
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#ffffff",
          padding: 32,
          borderRadius: 18,
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
          textAlign: "center"
        }}
      >
        <h1
          style={{
            margin: 0,
            marginBottom: 22,
            color: "#2a37d6",
            fontWeight: 800,
            fontSize: 28
          }}
        >
          Field Reports Login
        </h1>

        <input
          type="tel"
          inputMode="numeric"
          autoFocus
          placeholder="Enter PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") login()
          }}
          style={{
            width: "100%",
            padding: 16,
            fontSize: 24,
            borderRadius: 12,
            border: "3px solid #2a37d6",
            marginBottom: 20,
            color: "#111827",
            background: "#ffffff",
            boxSizing: "border-box",
            textAlign: "center"
          }}
        />

        <button
          onClick={login}
          disabled={loading}
          style={{
            width: "100%",
            padding: 18,
            fontSize: 22,
            background: "#2317d1",
            color: "#ffffff",
            border: "none",
            borderRadius: 12,
            fontWeight: 800,
            cursor: "pointer"
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </div>
    </main>
  )
}