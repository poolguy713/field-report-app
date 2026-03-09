"use client"

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#bcc9d8",
        fontFamily: "Arial",
        padding: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 700,
          background: "white",
          borderRadius: 18,
          padding: 30,
          boxShadow: "0 3px 10px rgba(0,0,0,0.1)"
        }}
      >
        <h1
          style={{
            fontSize: 52,
            margin: 0,
            color: "#2a37d6",
            fontWeight: 800
          }}
        >
          Field Report Portal
        </h1>

        <p
          style={{
            fontSize: 22,
            color: "#4b5563",
            marginTop: 16,
            marginBottom: 30
          }}
        >
          Choose where you want to go.
        </p>

        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap"
          }}
        >
          <button
            onClick={() => {
              window.location.href = "/report"
            }}
            style={{
              background: "#2317d1",
              color: "white",
              border: "none",
              borderRadius: 16,
              padding: "18px 26px",
              fontSize: 22,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Field Report Form
          </button>

          <button
            onClick={() => {
              window.location.href = "/office"
            }}
            style={{
              background: "#3d7be0",
              color: "white",
              border: "none",
              borderRadius: 16,
              padding: "18px 26px",
              fontSize: 22,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Office Reports
          </button>
        </div>
      </div>
    </main>
  )
}