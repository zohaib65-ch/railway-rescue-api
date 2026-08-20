'use strict';

const reportService = require('../services/reportService');
const { sendSuccess } = require('../utils/response');

async function getSummary(req, res, next) {
  try {
    const data = await reportService.getSummary(req.query);
    return sendSuccess(res, 200, 'Summary report retrieved', data);
  } catch (err) { next(err); }
}

async function getTrainsOverTime(req, res, next) {
  try {
    const data = await reportService.getTrainsOverTime(req.query);
    return sendSuccess(res, 200, 'Trains over time report retrieved', data);
  } catch (err) { next(err); }
}

async function getTeamPerformance(req, res, next) {
  try {
    const data = await reportService.getTeamPerformance(req.query);
    return sendSuccess(res, 200, 'Team performance report retrieved', data);
  } catch (err) { next(err); }
}

async function getResolutionTime(req, res, next) {
  try {
    const data = await reportService.getResolutionTime(req.query);
    return sendSuccess(res, 200, 'Resolution time report retrieved', data);
  } catch (err) { next(err); }
}

async function exportReport(req, res, next) {
  try {
    const csvContent = await reportService.exportTrainsCSV(req.query);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=train_report.csv');
    return res.status(200).send(csvContent);
  } catch (err) { next(err); }
}

module.exports = {
  getSummary,
  getTrainsOverTime,
  getTeamPerformance,
  getResolutionTime,
  exportReport,
};
