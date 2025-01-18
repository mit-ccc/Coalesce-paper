import * as React from "react";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Typography from "@mui/material/Typography";

// component that navigates back to the home page if user puts in an invalid url
function NoPage() {
  let navigate = useNavigate();

  useEffect(() => {
    navigate(`/`);
  }, []);

  return (
    <Typography sx={{ opacity: 0 }} variant="h4" component="div" gutterBottom>
      Page not found
    </Typography>
  );
}

export default NoPage;
