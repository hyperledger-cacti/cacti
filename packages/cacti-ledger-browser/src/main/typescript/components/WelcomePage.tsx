import Card from "@mui/material/Card";

const WelcomePage: React.FC = () => {
  return (
    <Card elevation={0} sx={{ textAlign: "center" }}>
      <h1>Cacti Ledger Browser</h1>
      <h3>Select an application to start from top-left menu</h3>
    </Card>
  );
};

export default WelcomePage;
