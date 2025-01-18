import React, { useState, useEffect } from "react";
import { Stack } from "@mui/material";
import { Typography } from "@mui/material";
import Button from "@mui/material/Button";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";

function TestCelery(props) {
  // state variable to keep track of the taskId
  //   const [taskId, setTaskId] = useState("");

  // state variable to store the final result
  const [result, setResult] = useState("");

  // function to call the get_result APi endpoint every second until the result is available
  const getResult = (taskId) => {
    // console.log("get result for task: ", taskId);
    fetch(`/api/get_result/${taskId}`)
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          throw new Error();
        }
      })
      .then((data) => {
        console.log("Success:", data);
        if (data.ready) {
          if (data.successful) {
            setResult(data.value);
          } else {
            console.error("Task failed");
            setResult("Task failed");
          }
        } else {
          setTimeout(() => {
            getResult(taskId);
          }, 1000);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  // function to test celery
  const testCelery = () => {
    console.log("test celery");
    // call the start_add endpoint to test celery
    let data = {
      a: 1,
      b: 2,
    };

    fetch("/api/start_add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      // check for any raised exceptions
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          throw new Error();
        }
      })
      .then((data) => {
        console.log("Success:", data);
        getResult(data.result);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  return (
    <ThemeProvider theme={theme}>
      <Stack
        direction="column"
        justifyContent="center"
        alignItems="center"
        spacing={5}
        sx={{ height: "100vh", width: "100vw" }}
      >
        <Typography variant="h2">Test Celery</Typography>
        <Button variant="contained" color="primary" onClick={testCelery}>
          Test Celery
        </Button>
        <Typography variant="h4">Result: {result}</Typography>
      </Stack>
    </ThemeProvider>
  );
}

export default TestCelery;
