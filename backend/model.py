import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models

class Hybrid(nn.Module):

    def __init__(self):
        super().__init__()

        resnet = models.resnet18(weights=None)

        self.enc0 = nn.Sequential(
            resnet.conv1,
            resnet.bn1,
            resnet.relu,
            resnet.maxpool
        )

        self.enc1 = resnet.layer1
        self.enc2 = resnet.layer2
        self.enc3 = resnet.layer3
        self.enc4 = resnet.layer4

        # Transformer fusion
        self.fusion = nn.TransformerEncoder(
            nn.TransformerEncoderLayer(
                d_model=512,
                nhead=8,
                batch_first=True
            ),
            num_layers=2
        )

        # Skip matching
        self.skip3 = nn.Conv2d(256,256,1)
        self.skip2 = nn.Conv2d(128,128,1)
        self.skip1 = nn.Conv2d(64,64,1)

        # Decoder
        self.up4 = nn.ConvTranspose2d(512,256,2,2)
        self.up3 = nn.ConvTranspose2d(256,128,2,2)
        self.up2 = nn.ConvTranspose2d(128,64,2,2)
        self.up1 = nn.ConvTranspose2d(64,32,2,2)

        self.final = nn.Conv2d(32,1,1)

    def get_features(self,x):
        l0 = self.enc0(x)
        l1 = self.enc1(l0)
        l2 = self.enc2(l1)
        l3 = self.enc3(l2)
        l4 = self.enc4(l3)
        return [l0,l1,l2,l3,l4]

    def forward(self,x1,x2):

        f1 = self.get_features(x1)
        f2 = self.get_features(x2)

        # Temporal difference only (NO multi-scale)
        diff = torch.abs(f1[4]-f2[4])

        B,C,H,W = diff.shape

        x = self.fusion(
            diff.flatten(2).permute(0,2,1)
        ).permute(0,2,1).reshape(B,C,H,W)

        def add_skip(current,skip_feat,up,skip_layer):

            current = up(current)
            skip_feat = skip_layer(skip_feat)

            if current.shape[2:] != skip_feat.shape[2:]:
                skip_feat = F.interpolate(
                    skip_feat,
                    size=current.shape[2:],
                    mode='bilinear',
                    align_corners=False
                )

            return current + skip_feat

        x = add_skip(x,torch.abs(f1[3]-f2[3]),self.up4,self.skip3)
        x = add_skip(x,torch.abs(f1[2]-f2[2]),self.up3,self.skip2)
        x = add_skip(x,torch.abs(f1[1]-f2[1]),self.up2,self.skip1)
        x = self.up1(x)

        out = self.final(x)

        return F.interpolate(out,size=(512,512),mode='bilinear')