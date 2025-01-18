import React, { useState, useEffect } from "react";
import * as d3 from "d3";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";

// redux stuff
import { useSelector, useDispatch } from "react-redux";
import { addEvent } from "../../store/userTrackingSlice";

// using random color: https://www.npmjs.com/package/randomcolor
// examples: https://randomcolor.lllllllllllllllll.com/
var randomColor = require("randomcolor");

function BarGraph(props) {
  // interactive bar graph for analyze topics feature
  // need the topic distribution (clickable) and question type distribution

  // props include data, suggestions, is_clickable, handleClick, id, screenWidth, selectedTopic
  // data is a dictionary mapping name to counts

  const dispatch = useDispatch();

  // get the project id from the Redux store
  const project_id = useSelector((state) => state.projectDetails.project_id);

  // function to add event to user tracking when user hovers over a topic
  const handleAddHoverEvent = (topic) => {
    var total = 0;
    Object.keys(props.data).forEach((key) => {
      total += props.data[key];
    });
    dispatch(
      addEvent({
        projectId: project_id,
        eventType: "hoverOverBar",
        eventDetail: {
          topic_name: topic,
          num_questions: props.data[topic] - 0.5,
          percent_of_total: (props.data[topic] - 0.5) / total,
        },
      })
    );
  };

  // function to add event to user tracking when user clicks on a topic
  const handleAddClickEvent = (topic) => {
    var total = 0;
    Object.keys(props.data).forEach((key) => {
      total += props.data[key];
    });
    dispatch(
      addEvent({
        projectId: project_id,
        eventType: "clickBar",
        eventDetail: {
          topic_name: topic,
          num_questions: props.data[topic] - 0.5,
          percent_of_total: (props.data[topic] - 0.5) / total,
        },
      })
    );
  };

  const topMargin = 5;
  const leftMargin = 5;
  const rightMargin = 30;
  const height = 65;

  const num_topic_threshold = 1; // used to be 7

  const [width, setWidth] = useState(
    props.screenWidth - leftMargin - rightMargin - 70
  );
  useEffect(() => {
    setWidth(props.screenWidth - leftMargin - rightMargin - 70);
  }, [props.screenWidth]);

  // have colors be from a color scheme
  // source: https://d3js.org/d3-scale-chromatic/categorical
  // const colors = d3.schemeSet2;

  // state variable to keep track of the colors
  const [colors, setColors] = useState([]);

  // set the unclassified topic to be light gray
  const unclassifiedColor = "#d3d3d3";

  // // for testing only, print out the colors
  // useEffect(() => {
  //   console.log("colors", colors);
  // }, [colors]);

  // // for testing only
  // useEffect(() => {
  //   console.log("data", props.data);
  // }, [props.data]);

  useEffect(() => {
    // if the number of topics in the data is more than the number of colors
    // then generate more colors
    if (Object.keys(props.data).length > colors.length) {
      const newColors = randomColor({
        luminosity: "light", // light or bright
        // count: Object.keys(props.data).length - colors.length,
        count: Object.keys(props.data).length,
        seed: 2,
      });
      // setColors(colors.concat(newColors));
      // drawChart(colors.concat(newColors));
      setColors(newColors);
      drawChart(newColors);
    } else {
      drawChart(colors);
    }
  }, [props]);

  const drawChart = (graphColors) => {
    // wipe off the old chart before plotting the new one
    d3.select(`#${props.id}`).selectAll("*").remove();

    var margin = {
      top: topMargin,
      right: rightMargin,
      bottom: topMargin,
      left: leftMargin,
    };

    // append the svg object to the body of the page
    // appends a 'group' element to 'svg'
    // moves the 'group' element to the top left margin
    var svg = d3
      .select(`#${props.id}`)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // calculate proportions of the counts
    // have the proportions be cumulative for the stacked bar chart
    var proportions = {};
    var total = 0;
    Object.keys(props.data).forEach((key) => {
      total += props.data[key];
    });
    var cumulative = 0;
    Object.keys(props.data).forEach((key) => {
      cumulative += props.data[key];
      proportions[key] = cumulative / total;
    });

    // organize the proportions from greatest to least
    var sorted_proportions = Object.fromEntries(
      Object.entries(proportions).sort((a, b) => b[1] - a[1])
    );

    // set the ranges
    var x = d3.scaleLinear().range([0, width]);
    var y = d3.scaleBand().range([0, height]);

    // scale the range of the data in the domains
    x.domain([0, 1]); // proportions are between 0 and 1
    y.domain([0]); // only one y value

    // create tooltip for the bars on hover
    var tooltip = d3
      .select(`#${props.id}`)
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background-color", "white")
      .style("border", "solid")
      .style("border-width", "1px")
      .style("border-radius", "5px")
      .style("padding", "10px")
      .style("font-size", "14px")
      .style("color", "black")
      .style("text-align", "left")
      .style("pointer-events", "none")
      .style("z-index", 1000);

    // mouseover function
    var mouseover = function (_event, d) {
      d3.select(this).attr("fill-opacity", 0.8);
    };

    // mousemove function
    var mousemove = function (event, d) {
      if (Object.keys(props.data).length < num_topic_threshold) {
        return;
      }
      tooltip
        .html(function () {
          // all topics are shifted by 0.5
          let count = props.data[d] - 0.5;
          if (count == 1) {
            return `${d} (1 question)`;
          } else {
            return `${d} (${count} questions)`;
          }
        })
        .style("opacity", 1)
        .style("left", function () {
          // if d is the last element, return 0
          if (
            Object.keys(sorted_proportions).indexOf(d) ===
            Object.keys(sorted_proportions).length - 1
          ) {
            return x(sorted_proportions[d]) / 2 + "px";
          }
          // get next topic
          const next =
            Object.keys(sorted_proportions)[
              Object.keys(sorted_proportions).indexOf(d) + 1
            ];
          return (
            (x(sorted_proportions[d]) - x(sorted_proportions[next])) / 2 +
            x(sorted_proportions[next]) +
            "px"
          );
        });
    };

    // mouseleave function
    var mouseleave = function (event, d) {
      if (Object.keys(props.data).length < num_topic_threshold) {
        d3.select(this).attr("fill-opacity", 1);
        return;
      }
      // add event to user tracking
      handleAddHoverEvent(d);
      // if (d === props.selectedTopic) {
      //   tooltip.style("opacity", 0);
      //   return;
      // }
      tooltip.style("opacity", 0);
      d3.select(this).attr("fill-opacity", 1);
    };

    // onclick function
    var onclick = function (d) {
      if (!props.is_clickable) {
        return;
      }
      // console.log("clicked", d);
      const xValue = x.invert(d.offsetX);
      // compare the x value to the proportions
      // find the first topic name that is greater than the x value
      var topic = Object.keys(proportions).find(
        (key) => proportions[key] > xValue
      );
      // if the topic is undefined, then the x value is the first topic of sorted_proportions
      if (topic === undefined) {
        topic = Object.keys(sorted_proportions)[0];
      }
      // console.log("topic", topic);
      // clear the tooltip
      tooltip.style("opacity", 0);
      // add event to user tracking
      handleAddClickEvent(topic);
      props.handleClick(topic);
    };

    // source for creating patterns: https://medium.com/@louisemoxy/how-to-create-a-d3-js-stacked-area-chart-with-pattern-fills-3bc4585a36ca
    // add defs to the SVG element to create a dashed pattern
    const defs = svg.append("defs");

    function createPattern(defs, fill) {
      // append a dashed pattern to the defs
      const pattern = defs
        .append("pattern")
        .attr("id", `${fill}-pattern`)
        .attr("patternUnits", "userSpaceOnUse")
        .attr("patternTransform", "scale(3) translate(0,0)")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 4)
        .attr("height", 4);

      // create a pattern with thick diagonal lines
      pattern
        .append("path")
        .attr("d", "M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2")
        .attr("stroke", fill)
        .attr("stroke-width", 2);
    }

    // create pattern for all colors
    graphColors.forEach((color) => {
      createPattern(defs, color);
    });
    // create pattern for unclassified color
    createPattern(defs, unclassifiedColor);

    // variable to keep track of the min width
    // set to really big number
    var minWidth = 100000;

    // append the rectangles for the bar chart
    // have each bar be a different color
    svg
      .selectAll(".bar")
      .data(Object.keys(sorted_proportions))
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", function (d) {
        // if d is the last element
        // then the x position is 0
        if (
          Object.keys(sorted_proportions).indexOf(d) ===
          Object.keys(sorted_proportions).length - 1
        ) {
          return 0;
        } else {
          // otherwise, the x position depends on the next one
          const next =
            Object.keys(sorted_proportions)[
              Object.keys(sorted_proportions).indexOf(d) + 1
            ];
          return x(sorted_proportions[next]) + 3;
        }
      })
      .attr("width", function (d) {
        // if d is the last element
        // then the width is sorted_proportions[d]
        if (
          Object.keys(sorted_proportions).indexOf(d) ===
          Object.keys(sorted_proportions).length - 1
        ) {
          let width = x(sorted_proportions[d]);
          // update min width if necessary
          if (width < minWidth) {
            minWidth = width;
          }
          return width;
        } else {
          // otherwise, the x position depends on the next one
          const next =
            Object.keys(sorted_proportions)[
              Object.keys(sorted_proportions).indexOf(d) + 1
            ];
          let width =
            x(sorted_proportions[d]) - x(sorted_proportions[next]) - 3;
          // update min width if necessary
          if (width < minWidth) {
            minWidth = width;
          }
          return width;
        }
      })
      .attr("y", function (_d) {
        return 0; // y position is always 0
      })
      .attr("height", y.bandwidth())
      .attr("fill", function (d) {
        // if the topic is unclassified, color it light gray
        if (d === "Unclassified") {
          // if 0 questions, then use the pattern
          if (props.data[d] === 0.5) {
            return `url('#${unclassifiedColor}-pattern')`;
          } else {
            return unclassifiedColor;
          }
        } else {
          // if 0 questions, then use the pattern
          if (props.data[d] === 0.5) {
            return `url('#${
              graphColors[Object.keys(sorted_proportions).indexOf(d)]
            }-pattern')`;
          } else {
            return graphColors[Object.keys(sorted_proportions).indexOf(d)]; // color depends on the topic
          }
        }
      })
      .attr("fill-opacity", function (d) {
        // if 0 questions, use full opacity
        if (props.data[d] === 0.5) {
          return 1;
        } else {
          return 0.9;
        }
      })
      .attr("stroke", function (d) {
        if (d === props.selectedTopic) {
          return "black";
        }
      })
      .attr("stroke-width", function (d) {
        if (d === props.selectedTopic) {
          return 5;
        }
      })
      .style("cursor", "pointer")
      .on("click", onclick)
      .on("mouseover", mouseover)
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave);

    // NOTE: the following code is commented out
    // to lessen the number of elements in the graph and prevent annoyance
    // // add a small red circle to the top right corner of each bar
    // // if the topic has suggestions
    // svg
    //   .selectAll(".circle")
    //   .data(Object.keys(sorted_proportions))
    //   .enter()
    //   .append("circle")
    //   .attr("class", "circle")
    //   .attr("cx", function (d) {
    //     return x(sorted_proportions[d]) - 6;
    //   })
    //   .attr("cy", 6)
    //   .attr("r", 6)
    //   .attr("fill", "red")
    //   .attr("fill-opacity", function (d) {
    //     if (props.suggestions[d]) {
    //       return 1;
    //     } else {
    //       return 0;
    //     }
    //   });

    // NOTE: the following code is commented out
    // because of formatting issues
    // label each bar with the name of the topic
    // have the name be in the middle of the bar
    // svg
    //   .selectAll(".text")
    //   .data(Object.keys(sorted_proportions))
    //   .enter()
    //   .append("text")
    //   .attr("class", "text")
    //   .attr("x", function (d) {
    //     // if d is the last element
    //     // then the x position should be half the width of the bar
    //     if (
    //       Object.keys(sorted_proportions).indexOf(d) ===
    //       Object.keys(sorted_proportions).length - 1
    //     ) {
    //       return x(sorted_proportions[d]) / 2;
    //     } else {
    //       // otherwise, the x position depends on the next one
    //       const next =
    //         Object.keys(sorted_proportions)[
    //           Object.keys(sorted_proportions).indexOf(d) + 1
    //         ];
    //       return (
    //         (x(sorted_proportions[d]) - x(sorted_proportions[next])) / 2 +
    //         x(sorted_proportions[next])
    //       );
    //     }
    //   })
    //   .attr("y", function (_d) {
    //     return y.bandwidth() / 2;
    //   })
    //   .attr("dy", ".35em")
    //   // bold the text
    //   .attr("font-weight", function (d) {
    //     if (d === props.selectedTopic) {
    //       return "bold";
    //     } else {
    //       return "normal";
    //     }
    //   })
    //   .attr("fill", "black")
    //   .attr("font-size", "14px")
    //   .attr("text-anchor", "middle")
    //   .text(function (d) {
    //     // return name of the topic
    //     // followed by the count
    //     // only display text when the number of topics is less than 10
    //     if (Object.keys(props.data).length < num_topic_threshold) {
    //       if (props.data[d] < 1) {
    //         return `${d} (0 questions)`;
    //       } else {
    //         return `${d} (${props.data[d]} questions)`;
    //       }
    //     } else {
    //       return "";
    //     }
    //   })
    //   // wrap the text if it's too long. use minWidth
    //   .call(wrap, minWidth);

    // NOTE: the following code is commented out
    // because of formatting issues
    // helper function to wrap text
    // function wrap(text, width) {
    //   text.each(function () {
    //     var text = d3.select(this),
    //       words = text.text().split(/\s+/).reverse(),
    //       word,
    //       line = [],
    //       lineNumber = 0,
    //       lineHeight = 1.2, // ems
    //       x = text.attr("x"),
    //       y = text.attr("y"),
    //       // dy = parseFloat(text.attr("dy")),
    //       dy = 0.2,
    //       tspan = text
    //         .text(null)
    //         .append("tspan")
    //         .attr("x", x)
    //         .attr("y", y)
    //         .attr("dy", dy + "em");
    //     while ((word = words.pop())) {
    //       line.push(word);
    //       tspan.text(line.join(" "));
    //       if (tspan.node().getComputedTextLength() > width) {
    //         line.pop();
    //         tspan.text(line.join(" "));
    //         line = [word];
    //         tspan = text
    //           .append("tspan")
    //           .attr("x", x)
    //           .attr("y", y)
    //           .attr("dy", ++lineNumber * lineHeight + dy + "em")
    //           .text(word);
    //       }
    //     }
    //   });
    // }
  };

  return (
    <ThemeProvider theme={theme}>
      <div id={props.id}></div>
    </ThemeProvider>
  );
}

export default BarGraph;
