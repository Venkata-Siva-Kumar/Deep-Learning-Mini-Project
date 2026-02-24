import React, { useState, useRef, useEffect } from "react";
import "./App.css";

function App() {
  // raw files and previews
  const [beforeFile, setBeforeFile] = useState(null);
  const [afterFile, setAfterFile] = useState(null);
  const [previewBefore, setPreviewBefore] = useState(null);
  const [previewAfter, setPreviewAfter] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [beforeHover, setBeforeHover] = useState(false);
  const [afterHover, setAfterHover] = useState(false);

  // rotating words for heading
  const words = ["Futuristic", "AI-Powered", "Research-Grade"];
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((i) => (i + 1) % words.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [words.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const bgRef = useRef(null);

  // animated background canvas
  useEffect(() => {
    const canvas = bgRef.current;
    const ctx = canvas.getContext("2d");
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const buildings = [];
    const silhouettes = [];
    let mouseX = w / 2;

    function createBuildings() {
      buildings.length = 0;
      const cols = 20;
      for (let i = 0; i < cols; i++) {
        const width = w / cols + Math.random() * 20;
        const height = h * (0.3 + Math.random() * 0.5);
        buildings.push({
          x: i * (w / cols),
          y: h - height,
          w: width,
          h: height,
          speed: 0.2 + Math.random() * 0.3,
        });
      }
    }

    function createSilhouettes() {
      silhouettes.length = 0;
      for (let i = 0; i < 6; i++) {
        silhouettes.push({
          x: Math.random() * w,
          y: h - 50,
          speed: 0.5 + Math.random() * 0.5,
        });
      }
    }

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      createBuildings();
      createSilhouettes();
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      // background color
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, w, h);
      // buildings
      buildings.forEach((b) => {
        const parallax = (mouseX / w - 0.5) * 50;
        b.x -= b.speed;
        if (b.x + b.w < 0) b.x = w;
        ctx.fillStyle = "#111";
        ctx.fillRect(b.x + parallax, b.y, b.w, b.h);
        // windows
        ctx.fillStyle = "rgba(0,255,255,0.1)";
        for (let yy = b.y + 10; yy < b.y + b.h; yy += 20) {
          for (let xx = b.x + parallax + 10; xx < b.x + b.w; xx += 20) {
            if (Math.random() < 0.1) ctx.fillRect(xx, yy, 8, 12);
          }
        }
      });
      // silhouettes
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      silhouettes.forEach((s) => {
        s.x -= s.speed;
        if (s.x < -20) s.x = w + 20;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 10, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
    });
    resize();
    draw();
    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);


  const beforeInputRef = useRef();
  const afterInputRef = useRef();
  const uploadRef = useRef(null);

  const handleFileSelect = (type, file) => {
    if (!file) return;
    if (type === "before") {
      setBeforeFile(file);
      setPreviewBefore(URL.createObjectURL(file));
    } else {
      setAfterFile(file);
      setPreviewAfter(URL.createObjectURL(file));
    }
    setResult(null);
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFileSelect(type, file);
    if (type === "before") setBeforeHover(false);
    else setAfterHover(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleSubmit = async () => {
    if (!beforeFile || !afterFile) {
      alert("Please select both images");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append("image_before", beforeFile);
    formData.append("image_after", afterFile);
    try {
      const response = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.error) {
        alert("Server error: " + data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to call prediction API");
    } finally {
      setLoading(false);
    }
  };

  // background canvas ref

  return (
    <div className="container">
      {/* background canvas sits behind everything */}
      <canvas ref={bgRef} className="background-canvas" />
      <div className="overlay" />

      {/* hero section */}
      <div className="hero">
        <h1 className="hero-title">
          <span className="rotator"></span> Building Change Detection in Multitemporal Satellite Imagery
        </h1>
        
      </div>

      {/* upload row */}
      <div className="upload-row" ref={uploadRef}>
        <div className="card">
          <h3>Image A</h3>
          <div
            className={`dropzone ${beforeHover ? "hover" : ""}`}
            onDragOver={handleDragOver}
            onDragEnter={() => setBeforeHover(true)}
            onDragLeave={() => setBeforeHover(false)}
            onDrop={(e) => handleDrop(e, "before")}
            onClick={() => beforeInputRef.current.click()}
          >
            {previewBefore ? (
              <img className="preview" src={previewBefore} alt="before" />
            ) : (
              <p>Drag & drop or click to select</p>
            )}
            <input
              type="file"
              accept="image/*"
              ref={beforeInputRef}
              style={{ display: "none" }}
              onChange={(e) => handleFileSelect("before", e.target.files[0])}
            />
          </div>
          {beforeFile && (
            <div className="file-info">
              {beforeFile.name} ({Math.round(beforeFile.size / 1024)} KB)
            </div>
          )}
        </div>

        <div className="card">
          <h3>Image B</h3>
          <div
            className={`dropzone ${afterHover ? "hover" : ""}`}
            onDragOver={handleDragOver}
            onDragEnter={() => setAfterHover(true)}
            onDragLeave={() => setAfterHover(false)}
            onDrop={(e) => handleDrop(e, "after")}
            onClick={() => afterInputRef.current.click()}
          >
            {previewAfter ? (
              <img className="preview" src={previewAfter} alt="after" />
            ) : (
              <p>Drag & drop or click to select</p>
            )}
            <input
              type="file"
              accept="image/*"
              ref={afterInputRef}
              style={{ display: "none" }}
              onChange={(e) => handleFileSelect("after", e.target.files[0])}
            />
          </div>
          {afterFile && (
            <div className="file-info">
              {afterFile.name} ({Math.round(afterFile.size / 1024)} KB)
            </div>
          )}
        </div>
      </div>

      <button onClick={handleSubmit} disabled={loading}>
        {loading ? (
          <>
            Detecting <span className="spinner" />
          </>
        ) : (
          "Detect Changes"
        )}
      </button>

      {/* result row */}
      {result && (
        <div className="result-row">
          <div className="result-card visible">
            <h4>Image A</h4>
            <img
              src={`http://127.0.0.1:8000/${result.before_image}?t=${Date.now()}`}
              alt="before"
            />
          </div>
          <div className="result-card visible">
            <h4>Image B</h4>
            <img
              src={`http://127.0.0.1:8000/${result.after_image}?t=${Date.now()}`}
              alt="after"
            />
          </div>
          <div className="result-card visible">
            <h4>Mask</h4>
            <img
              src={`http://127.0.0.1:8000/${result.mask}?t=${Date.now()}`}
              alt="mask"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

