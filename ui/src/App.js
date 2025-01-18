import React, { useState, useEffect } from "react";
import StartPage from "./components/start_components/StartPage";
import ProjectsPage from "./components/start_components/ProjectsPage";
import ContextPage from "./components/start_components/ContextPage";
import NoPage from "./components/NoPage";
import PlatformPage from "./components/workspace_components/PlatformPage";
import EventTracking from "./components/EventTracking";

// routing
import { Routes, Route, useNavigate } from "react-router-dom";

function App() {
  let navigate = useNavigate();

  // state variable to keep track of the user code
  const [userCode, setUserCode] = useState("");

  // useEffect that navigates to the home page is the user code is empty
  useEffect(() => {
    if (!userCode) {
      navigate(`/`);
    }
  }, []);

  return (
    <div>
      <Routes>
        <Route
          exact
          path="/"
          element={<StartPage userCode={userCode} setUserCode={setUserCode} />}
        />
        <Route
          exact
          path="/projects"
          element={<ProjectsPage userCode={userCode} />}
        />
        <Route
          exact
          path="/newProject/:projectID"
          element={<ContextPage userCode={userCode} />}
        />
        <Route
          exact
          path="/project/:projectID"
          element={<PlatformPage userCode={userCode} />}
        />
        <Route path="*" element={<NoPage />} />
      </Routes>
      <EventTracking userCode={userCode} />
    </div>
  );
}

export default App;
