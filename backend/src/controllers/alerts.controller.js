import * as alertsService from "../services/alerts.service.js";

export async function createAlert(req, res, next) {
  try {
    const userId = req.user.id || req.user.userId;
    const alert = await alertsService.createAlert(userId, req.body);
    res.status(201).json({
      success: true,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAlerts(req, res, next) {
  try {
    const userId = req.user.id || req.user.userId;
    const result = await alertsService.getAlertsForUser(userId, req.query);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAlertsStats(req, res, next) {
  try {
    const userId = req.user.id || req.user.userId;
    const stats = await alertsService.getAlertsStats(userId);
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}