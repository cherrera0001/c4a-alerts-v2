import * as assetsService from "../services/assets.service.js";
import { getUserById } from "../services/auth.service.js";

export async function createAsset(req, res, next) {
  try {
    const userId = req.user.id || req.user.userId;
    const asset = await assetsService.createAsset(userId, req.body);
    res.status(201).json({
      success: true,
      data: asset,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAssets(req, res, next) {
  try {
    const userId = req.user.id || req.user.userId;
    const user = await getUserById(userId);
    
    if (!user || !user.organizationId) {
      return res.status(400).json({
        success: false,
        error: "El usuario debe pertenecer a una organización",
      });
    }

    const result = await assetsService.getAssetsForOrganization(user.organizationId, req.query);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAssetById(req, res, next) {
  try {
    const userId = req.user.id || req.user.userId;
    const user = await getUserById(userId);
    
    if (!user || !user.organizationId) {
      return res.status(400).json({
        success: false,
        error: "El usuario debe pertenecer a una organización",
      });
    }

    const asset = await assetsService.getAssetById(user.organizationId, req.params.id);
    res.json({
      success: true,
      data: asset,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAsset(req, res, next) {
  try {
    const userId = req.user.id || req.user.userId;
    const user = await getUserById(userId);
    
    if (!user || !user.organizationId) {
      return res.status(400).json({
        success: false,
        error: "El usuario debe pertenecer a una organización",
      });
    }

    const asset = await assetsService.updateAsset(user.organizationId, req.params.id, req.body);
    res.json({
      success: true,
      data: asset,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAsset(req, res, next) {
  try {
    const userId = req.user.id || req.user.userId;
    const user = await getUserById(userId);
    
    if (!user || !user.organizationId) {
      return res.status(400).json({
        success: false,
        error: "El usuario debe pertenecer a una organización",
      });
    }

    await assetsService.deleteAsset(user.organizationId, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

