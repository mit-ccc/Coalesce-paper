// CONSTANTS

export const check_types_to_name = {
  readability: "Readability",
  bias: "Bias",
  specificity: "Specificity",
};

export const engagementTypeName = {
  Interview: "interview",
  Survey: "survey",
  "Conversation Guide": "conversation",
};

// HELPER FUNCTIONS

// adding timeout to API calls
export function timeoutPromise(ms, promise) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("promise timeout"));
    }, ms);
    promise.then(
      (res) => {
        clearTimeout(timeoutId);
        resolve(res);
      },
      (err) => {
        clearTimeout(timeoutId);
        reject(err);
      }
    );
  });
}

// function to estimate the time for a cell
export const estimateTime = (cell_details, modality, num_people = 6) => {
  let time_estimate = 0;
  if (cell_details.cell_type === "question") {
    if (cell_details.response_format === "open") {
      const reading_time = cell_details.main_text.split(" ").length / 100;
      // console.log("Reading time: ", reading_time);
      time_estimate += reading_time;
      if (modality === "survey" || modality === "interview") {
        time_estimate += 3;
      } else {
        time_estimate += 0.5 + 1 * num_people;
      }
    } else {
      // get the number of words in all the response categories
      let response_words = 0;
      cell_details.response_categories.forEach((category) => {
        response_words += category.split(" ").length;
      });
      const reading_time =
        (cell_details.main_text.split(" ").length + response_words) / 100;
      // console.log("Reading time: ", reading_time);
      time_estimate += reading_time;
      if (modality === "survey") {
        time_estimate += 0.5;
      } else if (modality === "interview") {
        time_estimate += 1;
      } else {
        time_estimate += 0.5 + 0.5 * num_people;
      }
    }
  } else {
    time_estimate = cell_details.main_text.split(" ").length / 100;
  }
  // console.log("Time estimate: ", time_estimate);
  // return time_estimate rounded to 1 decimal place
  return Math.round(time_estimate * 10) / 10;
};

// SAVING DATA

// CODE TO SAVE PROJECT DETAILS

// helper function to check if added_cells, deleted_cells, or edited_cells is not empty
const checkCellHistory = (projectDetails) => {
  if (
    projectDetails.added_cells.length > 0 ||
    projectDetails.deleted_cells.length > 0 ||
    projectDetails.edited_cells.length > 0 ||
    projectDetails.edited_title
  ) {
    return true;
  }
  return false;
};

// function to save the project details
export const saveProjectDetails = async (projectDetails) => {
  console.log("Checking if project details need to be saved");
  let status = "nan";
  if (projectDetails.project_id !== "" && checkCellHistory(projectDetails)) {
    console.log("Saving project details");
    let data = {
      project_id: projectDetails.project_id,
      project_title: projectDetails.project_title,
      sections: projectDetails.sections,
      cells: projectDetails.cells,
      deleted_cells: projectDetails.deleted_cells,
      edited_cells: projectDetails.edited_cells,
      added_cells: projectDetails.added_cells,
    };
    await timeoutPromise(
      10000,
      fetch("/api/update_all_questions", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
    )
      // check for any raised exceptions
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          throw new Error();
        }
      })
      .then((_data) => {
        console.log("Project details saved");
        status = "success";
      })
      .catch((_error) => {
        console.error("Error saving project details");
        status = "error";
      });
  }
  return status;
};

// CODE TO SAVE PROJECT CONTEXT

// function to save the project context
export const saveProjectContext = async (projectContext) => {
  console.log("Checking if project context needs to be saved");
  // console.log(projectContext.project_id, projectContext.edited);
  let status = "nan";
  if (projectContext.project_id !== "" && projectContext.edited) {
    console.log("Saving project context");
    let data = {
      project_id: projectContext.project_id,
      context: projectContext.context,
    };
    await timeoutPromise(
      10000,
      fetch("/api/update_context", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
    )
      // check for any raised exceptions
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          throw new Error();
        }
      })
      .then((_data) => {
        console.log("Project context saved");
        status = "success";
      })
      .catch((_error) => {
        console.error("Error saving project context");
        status = "error";
      });
  }
  return status;
};

// CODE TO SAVE ANALYZE TOPICS

// function to save the analyze topics
// function to save the project context
export const saveAnalyzeTopics = async (analyzeTopics, project_id) => {
  console.log("Checking if analyze topics info needs to be saved");
  let status = "nan";
  if (analyzeTopics.need_to_save) {
    console.log("Saving analyze topics info");
    let data = {
      project_id: project_id,
      summary: analyzeTopics.summary,
      topics: analyzeTopics.topics,
      suggestions: analyzeTopics.suggestions,
      last_analyzed: analyzeTopics.last_analyzed,
      human_topics: analyzeTopics.human_topics,
    };
    await timeoutPromise(
      10000,
      fetch("/api/save_analyze_topics_info", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
    )
      // check for any raised exceptions
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          throw new Error();
        }
      })
      .then((_data) => {
        console.log("Analyze topics info saved");
        status = "success";
      })
      .catch((_error) => {
        console.error("Error saving analyze topics info");
        status = "error";
      });
  }
  return status;
};

////////////////////////////////////////

// // NOTE: not needed for now
// export const rootUrl =
//   process.env.NODE_ENV === "production" ? "http://3.239.204.180/" : "";

// // NOTE: not needed for now
// export const API_ROOT_TESTING = "http://127.0.0.1:5194"; // TODO: update if needed

// // NOTE: not needed for now
// export function isRunningLocally() {
//   const localHostNames = ["localhost", "127.0.0.1"]; // TODO: update if needed
//   return localHostNames.includes(window.location.hostname);
// }
