// Part of Redux Store that stores all the info for the analyze topics page

import { createSlice } from "@reduxjs/toolkit";
import { deleteCell } from "./projectDetailsSlice";

export const analyzeTopicsSlice = createSlice({
  name: "analyzeTopics",
  initialState: {
    added_topics: [],
    summary: "",
    last_analyzed: "",
    topics: {
      Unclassified: {
        cells: [],
        suggestion_rationale: "",
      },
    },
    suggestions: {},
    human_topics: {}, // topic classifications that users made
    need_to_save: false, // flag to indicate if the topics need to be saved
  },
  reducers: {
    resetNeedToSave: (state) => {
      state.need_to_save = false;
    },
    resetAddedTopics: (state) => {
      state.added_topics = [];
    },
    resetTopicSlice: (state) => {
      state.added_topics = [];
      state.summary = "";
      state.last_analyzed = "";
      state.topics = {
        Unclassified: {
          cells: [],
          suggestion_rationale: "",
        },
      };
      state.suggestions = {};
      state.human_topics = {};
    },
    setTopics: (state, action) => {
      state.topics = action.payload.topics;
      state.human_topics = action.payload.human_topics;
      state.summary = action.payload.summary;
      state.last_analyzed = action.payload.last_analyzed;
      state.suggestions = action.payload.suggestions;
      // clear added_topics
      state.added_topics = [];
    },
    addTopic: (state, action) => {
      // add a new key to topics
      // payload has new topic name
      state.topics[action.payload.topic_name] = {
        cells: [],
        suggestion_rationale: "",
      };
      // TODO: add to suggestions?? Don't think I need to do that
      // append to added_topics
      state.added_topics.push(action.payload.topic_name);
      state.need_to_save = true;
    },
    deleteTopic: (state, action) => {
      // delete a key from topics and suggestions
      // payload has topic name
      delete state.topics[action.payload.topic_name];
      delete state.suggestions[action.payload.topic_name];
      // remove from added_topics
      state.added_topics = state.added_topics.filter(
        (topic) => topic !== action.payload.topic_name
      );
      // remove from all elements of human_topics
      Object.keys(state.human_topics).forEach((cell_id) => {
        state.human_topics[cell_id] = state.human_topics[cell_id].filter(
          (topic) => topic !== action.payload.topic_name
        );
      });
      state.need_to_save = true;
    },
    deleteCellFromTopic: (state, action) => {
      // delete a cell_id from all topics
      // payload has cell_id
      Object.keys(state.topics).forEach((topic) => {
        state.topics[topic].cells = state.topics[topic].cells.filter(
          (cell_id) => cell_id !== action.payload.cell_id
        );
      });
      // delete the cell from all delete suggestions
      Object.keys(state.suggestions).forEach((topic) => {
        state.suggestions[topic].map((suggestion) => {
          if (suggestion.suggestion_type === "delete") {
            suggestion.suggestions = suggestion.suggestions.filter(
              (suggestion2) => suggestion2.cell_id !== action.payload.cell_id
            );
          }
        });
      });
      // delete the cell from human_topics
      delete state.human_topics[action.payload.cell_id];
      state.need_to_save = true;
    },
    updateTopicClassification: (state, action) => {
      // update topic classification for a cell_id
      // payload has cell_id and selected_topics
      // go through each topic
      // if the topic is in selected_topics, add the cell_id to the topic
      // if the topic is not in selected_topics, remove the cell_id from the topic
      // set edited to true only if the selected_topics are different from the current topics
      Object.keys(state.topics).forEach((topic) => {
        if (
          action.payload.selected_topics.includes(topic) &&
          !state.topics[topic].cells.includes(action.payload.cell_id)
        ) {
          state.topics[topic].cells.push(action.payload.cell_id);
        } else if (
          !action.payload.selected_topics.includes(topic) &&
          state.topics[topic].cells.includes(action.payload.cell_id)
        ) {
          state.topics[topic].cells = state.topics[topic].cells.filter(
            (cell_id) => cell_id !== action.payload.cell_id
          );
          if (state.suggestions[topic]) {
            state.suggestions[topic].map((suggestion) => {
              if (suggestion.suggestion_type === "delete") {
                suggestion.suggestions = suggestion.suggestions.filter(
                  (suggestion2) =>
                    suggestion2.cell_id !== action.payload.cell_id
                );
              }
            });
          }
        }
      });
      // set cell_id in human_topics to selected_topics
      state.human_topics[action.payload.cell_id] =
        action.payload.selected_topics;

      state.need_to_save = true;
    },
    updateTopics: (state, action) => {
      // update the entire topics object
      // payload has the new topics object
      state.topics = action.payload.topics;
      state.summary = action.payload.summary;
      state.last_analyzed = action.payload.last_analyzed;
      state.suggestions = action.payload.suggestions;
    },
    updateSectionIdForSuggestion: (state, action) => {
      // update the section_id field for a particular suggestion
      // payload has the new section_id and topic and main_text
      // get the add suggestions from the topic
      state.suggestions[action.payload.topic].map((suggestion) => {
        if (suggestion.suggestion_type === "add") {
          suggestion.suggestions = suggestion.suggestions.map((suggestion2) => {
            if (
              suggestion2.cell_details.main_text === action.payload.main_text
            ) {
              suggestion2.section_id = action.payload.section_id;
            }
            return suggestion2;
          });
        }
      });
      state.need_to_save = true;
    },
    removeSuggestionFromTopic: (state, action) => {
      // remove a suggestion from a topic
      // payload has the topic and suggestion and type
      // filter by cell_details.main_text if type is "add"
      if (action.payload.type === "add") {
        // get the add suggestions from the topic
        state.suggestions[action.payload.topic].map((suggestion) => {
          if (suggestion.suggestion_type === "add") {
            suggestion.suggestions = suggestion.suggestions.filter(
              (suggestion2) =>
                suggestion2.cell_details.main_text !==
                action.payload.suggestion.cell_details.main_text
            );
          }
        });
      } else {
        // get the delete suggestions from the topic
        state.suggestions[action.payload.topic].map((suggestion) => {
          if (suggestion.suggestion_type === "delete") {
            suggestion.suggestions = suggestion.suggestions.filter(
              (suggestion2) =>
                suggestion2.cell_id !== action.payload.suggestion.cell_id
            );
          }
        });
      }
      state.need_to_save = true;
    },
    addSuggestionsForTopic: (state, action) => {
      // add suggestions for a topic
      // payload has the suggestionObject and topic
      // if the topic is not in suggestions, add it
      if (!state.suggestions[action.payload.topic]) {
        state.suggestions[action.payload.topic] = [
          action.payload.suggestionObject,
        ];
      } else {
        let hasSuggestion = false;

        // replace the suggestion with the same suggestion_type if it exists
        state.suggestions[action.payload.topic].map((suggestion) => {
          if (
            suggestion.suggestion_type ===
            action.payload.suggestionObject.suggestion_type
          ) {
            suggestion.suggestions =
              action.payload.suggestionObject.suggestions;
            hasSuggestion = true;
          }
        });

        if (!hasSuggestion) {
          // if the suggestion does not exist, add it to the beginning of the list
          state.suggestions[action.payload.topic].unshift(
            action.payload.suggestionObject
          );
        }
      }
      state.need_to_save = true;
    },
  },
});

export const {
  resetNeedToSave,
  resetAddedTopics,
  resetTopicSlice,
  setTopics,
  addTopic,
  deleteTopic,
  deleteCellFromTopic,
  updateTopicClassification,
  updateTopics,
  updateSectionIdForSuggestion,
  removeSuggestionFromTopic,
  addSuggestionsForTopic,
} = analyzeTopicsSlice.actions;

export default analyzeTopicsSlice.reducer;
