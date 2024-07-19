import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { SvgIconComponent } from "@mui/icons-material";

interface TitleWithIconProps {
  icon: SvgIconComponent;
  children: React.ReactNode;
}

const TitleWithIcon: React.FC<TitleWithIconProps> = ({
  children,
  icon: Icon,
}) => {
  return (
    <Box display="flex" alignItems="center" marginBottom={2}>
      <Icon sx={{ fontSize: 35 }} color="primary" />
      <Typography variant="h6" component="h3" marginLeft={1}>
        {children}
      </Typography>
    </Box>
  );
};

export default TitleWithIcon;
