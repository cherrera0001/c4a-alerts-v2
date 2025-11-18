import * as ctiService from "../services/cti.service.js";

export async function createCtiItem(req, res, next) {
  try {
    const item = await ctiService.ingestFeedItem(req.body);
    res.status(201).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCtiItems(req, res, next) {
  try {
    const result = await ctiService.getCtiItems(req.query);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function enrichCtiItem(req, res, next) {
  try {
    const doc = await import("../config/firebase.js").then(m => m.db.collection("cti_items").doc(req.params.id).get());
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: "Item CTI no encontrado",
      });
    }

    const item = { id: doc.id, ...doc.data() };
    const enriched = await ctiService.enrichItem(item);
    
    res.json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    next(error);
  }
}
