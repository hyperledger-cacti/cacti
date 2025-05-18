import { useState } from "react";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";

import { EthAllERC721TokensByAccountResponseType } from "../../queries";
import ShortenedTypography from "../../../../components/ui/ShortenedTypography";
import nftPlaceholderImage from "../../static/nft-placeholder.png";

export type NFTCardProps = {
  tokenDetails: EthAllERC721TokensByAccountResponseType;
};

export default function NFTCard({ tokenDetails }: NFTCardProps) {
  // set nftPlaceholderImage as default image
  const [imageUrl, setImageUrl] = useState(
    tokenDetails.nft_image || nftPlaceholderImage,
  );

  // use default image if imageUrl can not load in
  const handleImageError = () => {
    setImageUrl(nftPlaceholderImage);
  };

  return (
    <Card sx={{ maxWidth: 300 }}>
      <CardMedia
        component="img"
        image={imageUrl}
        alt="nft token image"
        onError={handleImageError}
      />
      <CardContent>
        <Typography variant="h5" component="div">
          {tokenDetails.token_metadata_erc721.name} #{tokenDetails.token_id}
        </Typography>
        <List>
          <ListItem disablePadding>
            <ListItemText
              primary="Symbol"
              primaryTypographyProps={{ variant: "body2", paddingRight: 5 }}
            />
            <Typography color="text.secondary" variant="body2">
              {tokenDetails.token_metadata_erc721.symbol}
            </Typography>
          </ListItem>
          <ListItem disablePadding>
            <ListItemText
              primary="Contract"
              primaryTypographyProps={{ variant: "body2", paddingRight: 5 }}
            />
            <ShortenedTypography
              text={tokenDetails.token_metadata_erc721.address}
              variant="body2"
              width="70%"
              color="text.secondary"
              direction="rtl"
            />
          </ListItem>
          <ListItem disablePadding>
            <ListItemText
              primary="Name"
              primaryTypographyProps={{ variant: "body2", paddingRight: 5 }}
            />
            <Typography color="text.secondary" variant="body2">
              {tokenDetails.nft_name}
            </Typography>
          </ListItem>
          <ListItem disablePadding>
            <ListItemText
              primary="Description"
              primaryTypographyProps={{ variant: "body2", paddingRight: 5 }}
            />
            <Typography color="text.secondary" variant="body2">
              {tokenDetails.nft_description}
            </Typography>
          </ListItem>
        </List>
      </CardContent>
    </Card>
  );
}
