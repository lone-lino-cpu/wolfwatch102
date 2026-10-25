import React from "react";
import { useEffect, useRef } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import L from "leaflet";
import adminDocument from "../admin-lino.html?raw";
import citizenDocument from "../citizen-4.html?raw";
import adminMarkup from "./markup/admin.html?raw";
import citizenMarkup from "./markup/citizen.html?raw";
import adminStyles from "./styles/admin.css?inline";
import citizenStyles from "./styles/citizen.css?inline";

function extractDocument(source) {
  const parsed = new DOMParser().parseFromString(source, "text/html");
  return {
    scripts: Array.from(parsed.scripts)
      .filter((script) => !script.src)
      .map((script) => script.textContent)
      .filter((script) => script.trim()),
  };
}

function OriginalApp({ source, isAdmin }) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    const original = extractDocument(source);
    const previousTitle = document.title;
    document.title = isAdmin ? "WolfWatch — Admin" : "WolfWatch — Citizen";
    const style = document.createElement("style");
    style.textContent = isAdmin ? adminStyles : citizenStyles;
    document.head.appendChild(style);
    host.innerHTML = isAdmin ? adminMarkup : citizenMarkup;

    mapRef.current = isAdmin ? host.querySelector("#map") : null;
    const intervals = [];
    const listeners = [];
    const maps = [];
    const originalSetInterval = window.setInterval;
    const originalAddEventListener = window.addEventListener;
    const trackedLeaflet = new Proxy(L, {
      get(target, property, receiver) {
        if (property === "map") {
          return (...args) => {
            const map = target.map(...args);
            maps.push(map);
            return map;
          };
        }
        return Reflect.get(target, property, receiver);
      },
    });

    window.setInterval = (...args) => {
      const interval = originalSetInterval(...args);
      intervals.push(interval);
      return interval;
    };
    window.addEventListener = function (type, listener, options) {
      listeners.push([type, listener, options]);
      return originalAddEventListener.call(this, type, listener, options);
    };

    try {
      const script = isAdmin
        ? original.scripts.join("\n").replace('L.map("map",', "L.map(mapContainerRef.current,")
        : original.scripts.join("\n");
      new Function("L", "mapContainerRef", script)(
        trackedLeaflet,
        mapRef,
      );
    } finally {
      window.setInterval = originalSetInterval;
      window.addEventListener = originalAddEventListener;
    }

    return () => {
      listeners
        .filter(([type]) => type === "beforeunload")
        .forEach(([, listener]) => listener());
      listeners.forEach(([type, listener, options]) => {
        window.removeEventListener(type, listener, options);
      });
      intervals.forEach((interval) => window.clearInterval(interval));
      maps.forEach((map) => map.remove());
      host.replaceChildren();
      style.remove();
      document.title = previousTitle;
    };
  }, [source, isAdmin]);

  return <div ref={hostRef} style={{ display: "contents" }} />;
}

function AdminApp() {
  return <OriginalApp source={adminDocument} isAdmin />;
}

function CitizenApp() {
  return <OriginalApp source={citizenDocument} isAdmin={false} />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminApp />} />
        <Route path="/citizen" element={<CitizenApp />} />
        <Route path="/" element={<CitizenApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
