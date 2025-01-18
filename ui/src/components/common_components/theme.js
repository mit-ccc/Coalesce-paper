// Reference: https://github.com/mit-ccc/SenseMate/blob/main/sensemate/src/components/common/theme.js

// Style Typography: https://mui.com/material-ui/customization/typography/
// Style the color palette: https://mui.com/material-ui/customization/palette/
// Style transitions: https://mui.com/material-ui/customization/transitions/

import { createTheme } from "@mui/material/styles";
import { grey } from "@mui/material/colors";

const defaultTheme = createTheme();

const theme = createTheme({
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          // have font weight be slightly bolder than default
          fontWeight: "700",
        },
      },
      variants: [
        {
          props: { variant: "bigButtons", size: "large" },
          style: {
            color: "white",
            backgroundColor: defaultTheme.palette.primary.main,
            "&:hover": {
              backgroundColor: defaultTheme.palette.primary.dark,
            },
            fontWeight: "bold",
            fontSize: 18,
          },
        },
        {
          props: { variant: "appBarButton" },
          style: {
            color: "white",
            // no background color
            backgroundColor: "transparent",
          },
        },
      ],
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: defaultTheme.palette.primary.light,
          color: "white",
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: defaultTheme.palette.primary.main,
        },
      },
      variants: [
        {
          props: { variant: "secondary" },
          style: {
            color: grey[500],
          },
        },
        {
          props: { variant: "appBar" },
          style: {
            color: "white",
          },
        },
        {
          props: { variant: "appBarHome" },
          style: {
            color: grey[800],
          },
        },
        {
          props: { variant: "info" },
          style: {
            color: defaultTheme.palette.primary.light,
          },
        },
      ],
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: grey[400],
          color: "white",
        },
      },
      variants: [
        {
          props: { variant: "button" },
          style: {
            backgroundColor: defaultTheme.palette.primary.main,
            color: "white",
            "&:hover": {
              backgroundColor: defaultTheme.palette.primary.dark,
            },
          },
        },
        {
          props: { variant: "questionStatus" },
          style: {
            backgroundColor: defaultTheme.palette.primary.light,
            color: "white",
          },
        },
      ],
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: grey[500],
        },
      },
    },
  },
});

export default theme;
