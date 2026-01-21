import TravelRecord from '../models/TravelTracker.js';
import { Op, Sequelize } from 'sequelize';
import User from '../models/User.js';

const RATE_PER_KM = 3;
const ELIGIBLE_VEHICLE_TYPE = 'OWN_VEHICLE';

const toNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const numeric = parseFloat(value);
    if (!Number.isNaN(numeric) && Number.isFinite(numeric)) return numeric;
  }
  return null;
};

const toLatLng = (value) => {
  if (!value || typeof value !== 'object') return null;
  const lat =
    toNumber(value.lat) ??
    toNumber(value.latitude) ??
    toNumber(value.Latitude) ??
    toNumber(value.latDeg);
  const lng =
    toNumber(value.lng) ??
    toNumber(value.lon) ??
    toNumber(value.longitude) ??
    toNumber(value.Longitude) ??
    toNumber(value.lngDeg);

  if (lat === null || lng === null) return null;
  return { lat, lng };
};

const decodePolyline = (encoded) => {
  if (!encoded || typeof encoded !== 'string') return [];

  let index = 0;
  const len = encoded.length;
  const coordinates = [];
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let result = 0;
    let shift = 0;
    let b;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return coordinates;
};

const extractPathFromString = (value) => {
  const trimmed = value?.toString().trim();
  if (!trimmed) return [];

  if (/^[a-zA-Z0-9_.~:-]+$/.test(trimmed) && /[A-Za-z]/.test(trimmed)) {
    return decodePolyline(trimmed);
  }

  const separators = /[|;\n]/;
  const segments = trimmed.split(separators);
  const coordinates = [];

  segments.forEach((segment) => {
    const [latRaw, lngRaw] = segment.split(',').map((token) => token?.trim());
    const lat = toNumber(latRaw);
    const lng = toNumber(lngRaw);
    if (lat !== null && lng !== null) {
      coordinates.push({ lat, lng });
    }
  });

  return coordinates;
};

const extractPathRecursively = (input, depth = 0) => {
  if (!input || depth > 6) return [];

  if (Array.isArray(input)) {
    if (
      input.length === 2 &&
      toNumber(input[0]) !== null &&
      toNumber(input[1]) !== null
    ) {
      const lat = toNumber(input[0]);
      const lng = toNumber(input[1]);
      if (lat !== null && lng !== null) {
        return [{ lat, lng }];
      }
    }

    return input.flatMap((item) => extractPathRecursively(item, depth + 1));
  }

  if (typeof input === 'string') {
    return extractPathFromString(input);
  }

  if (typeof input !== 'object') return [];

  const candidate = input;
  const latLng = toLatLng(candidate);
  if (latLng) {
    return [latLng];
  }

  const nestedKeys = [
    'location',
    'position',
    'geometry',
    'start_location',
    'end_location',
    'startLocation',
    'endLocation',
    'origin',
    'destination',
    'startPoint',
    'endPoint',
    'routeGeometry',
  ];
  for (const key of nestedKeys) {
    if (candidate[key]) {
      const nested = extractPathRecursively(candidate[key], depth + 1);
      if (nested.length) return nested;
    }
  }

  const pathKeys = [
    'path',
    'paths',
    'points',
    'coordinates',
    'polyline',
    'overview_path',
    'overviewPath',
    'polylinePoints',
    'routes',
    'legs',
    'steps',
    'segments',
    'line',
  ];
  for (const key of pathKeys) {
    if (candidate[key]) {
      const nested = extractPathRecursively(candidate[key], depth + 1);
      if (nested.length) return nested;
    }
  }

  return [];
};

const computeBounds = (path) => {
  if (!path.length) return null;
  let north = path[0].lat;
  let south = path[0].lat;
  let east = path[0].lng;
  let west = path[0].lng;

  path.forEach((point) => {
    north = Math.max(north, point.lat);
    south = Math.min(south, point.lat);
    east = Math.max(east, point.lng);
    west = Math.min(west, point.lng);
  });

  return { north, south, east, west };
};

const buildRouteGeometry = (route) => {
  if (!route) return null;

  const providedGeometry = typeof route === 'object' && !Array.isArray(route) ? route : null;
  if (providedGeometry?.path && Array.isArray(providedGeometry.path)) {
    const path = providedGeometry.path
      .map((point) => toLatLng(point))
      .filter(Boolean);
    if (path.length) {
      return {
        path,
        bounds: computeBounds(path),
        start: toLatLng(providedGeometry.start) ?? path[0],
        end: toLatLng(providedGeometry.end) ?? path[path.length - 1],
      };
    }
  }

  const path = extractPathRecursively(route);
  if (!path.length) return null;

  return {
    path,
    bounds: computeBounds(path),
    start: path[0],
    end: path[path.length - 1],
  };
};

const normaliseVehicleType = (value = '') => {
  if (!value) return null;
  const formatted = value.toString().trim().toUpperCase().replace(/\s+/g, '_');

  const aliases = {
    OWN_VEHICLE: ['OWN', 'OWN_VEHICLE', 'OWN-VEHICLE', 'OWN VEHICLE', 'BIKE', 'CAR', 'BUS', 'OTHER'],
    COLLEAGUE: ['COLLEAGUE', 'WITH_COLLEAGUE', 'COLLEAGUE_VEHICLE'],
    COMPANY_VEHICLE: ['COMPANY', 'COMPANY_VEHICLE', 'COMPANY-VEHICLE', 'COMPANY VEHICLE'],
  };

  const matchedKey = Object.entries(aliases).find(([, options]) =>
    options.includes(formatted)
  );

  return matchedKey ? matchedKey[0] : formatted;
};

const serialiseRoute = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string') return value;

  try {
    return JSON.stringify(value);
  } catch (error) {
    return null;
  }
};

const sanitiseRecord = (recordInstance) => {
  if (!recordInstance) return null;

  const plain = recordInstance.toJSON();

  if (plain.route) {
    try {
      plain.route = JSON.parse(plain.route);
    } catch (error) {
      // Keep route as-is if JSON.parse fails
    }
  }

  plain.routeGeometry = buildRouteGeometry(plain.route);

  return plain;
};

// 💠 Add / Update Travel Record
export const createOrUpdateTravel = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const {
      date,
      distance_km,
      vehicle_type,
      route,
      started_at,
      ended_at,
      auto_ended,
      id,
      record_id,
      travel_id,
    } = req.body;

    if (!userId)
      return res.status(401).json({ success: false, message: 'Unauthorised. Please sign in again.', code: 'UNAUTHORIZED' });

    if (!date || distance_km === undefined || distance_km === null || !vehicle_type)
      return res.status(400).json({ success: false, message: 'Missing required fields', code: 'VALIDATION_ERROR' });

    const normalisedVehicleType = normaliseVehicleType(vehicle_type);
    const validVehicleTypes = ['OWN_VEHICLE', 'COLLEAGUE', 'COMPANY_VEHICLE'];

    if (!validVehicleTypes.includes(normalisedVehicleType))
      return res.status(400).json({ success: false, message: 'Invalid vehicle type provided', code: 'VALIDATION_ERROR' });

    const recordDate = new Date(date);

    if (Number.isNaN(recordDate.getTime()))
      return res.status(400).json({ success: false, message: 'Invalid date supplied', code: 'VALIDATION_ERROR' });

    const dateOnly = recordDate.toISOString().slice(0, 10);

    const numericDistance = parseFloat(distance_km);

    if (Number.isNaN(numericDistance) || numericDistance < 0)
      return res.status(400).json({ success: false, message: 'Distance must be a non-negative number', code: 'VALIDATION_ERROR' });

    const payoutEligible = normalisedVehicleType === ELIGIBLE_VEHICLE_TYPE;
    const payout = payoutEligible ? numericDistance * RATE_PER_KM : 0;

    let startedAt = null;
    if (started_at !== undefined && started_at !== null && started_at !== '') {
      const parsedStart = new Date(started_at);
      if (Number.isNaN(parsedStart.getTime()))
        return res.status(400).json({ success: false, message: 'Invalid start time supplied', code: 'VALIDATION_ERROR' });
      startedAt = parsedStart;
    }

    let endedAt = null;
    if (ended_at !== undefined && ended_at !== null && ended_at !== '') {
      const parsedEnd = new Date(ended_at);
      if (Number.isNaN(parsedEnd.getTime()))
        return res.status(400).json({ success: false, message: 'Invalid end time supplied', code: 'VALIDATION_ERROR' });
      endedAt = parsedEnd;
    }

    if (startedAt && endedAt && endedAt < startedAt)
      return res.status(400).json({ success: false, message: 'End time cannot be before start time', code: 'VALIDATION_ERROR' });

    const payload = {
      user_id: userId,
      date: dateOnly,
      distance_km: numericDistance,
      vehicle_type: normalisedVehicleType,
      route: serialiseRoute(route),
      payout,
      started_at: startedAt,
      ended_at: endedAt,
      auto_ended: Boolean(auto_ended),
    };

    const travelId = id ?? record_id ?? travel_id;

    if (travelId) {
      const record = await TravelRecord.findOne({
        where: { id: travelId, user_id: userId },
      });

      if (!record)
        return res.status(404).json({ success: false, message: 'Travel record not found for this user', code: 'TRAVEL_RECORD_NOT_FOUND' });

      record.date = dateOnly;
      record.distance_km = numericDistance;
      record.vehicle_type = normalisedVehicleType;
      record.payout = payout;
      
      // Merge stops and path instead of overriding
      if (route !== undefined) {
        let existingRoute = null;
        try {
          if (record.route) {
            existingRoute = typeof record.route === 'string' 
              ? JSON.parse(record.route) 
              : record.route;
          }
        } catch (error) {
          // If parsing fails, treat as new route
          existingRoute = null;
        }

        let mergedRoute;
        
        // If existing route exists and new route is an object, merge stops and path
        if (existingRoute && typeof route === 'object' && !Array.isArray(route)) {
          mergedRoute = { ...existingRoute };
          
          // Merge stops array
          if (route.stops !== undefined && Array.isArray(route.stops)) {
            const existingStops = Array.isArray(existingRoute.stops) ? existingRoute.stops : [];
            mergedRoute.stops = [...existingStops, ...route.stops];
          }
          
          // Merge path array
          if (route.path !== undefined && Array.isArray(route.path)) {
            const existingPath = Array.isArray(existingRoute.path) ? existingRoute.path : [];
            mergedRoute.path = [...existingPath, ...route.path];
          }
          
          // Update other route properties if provided (but don't override stops/path if not provided)
          Object.keys(route).forEach(key => {
            if (key !== 'stops' && key !== 'path' && route[key] !== undefined) {
              mergedRoute[key] = route[key];
            }
          });
        } else {
          // No existing route or route is not an object, use new route as-is
          mergedRoute = route;
        }
        
        record.route = serialiseRoute(mergedRoute);
      }
      
      if (started_at !== undefined) record.started_at = startedAt;
      if (ended_at !== undefined) record.ended_at = endedAt;
      if (auto_ended !== undefined) record.auto_ended = Boolean(auto_ended);

      await record.save();

      res.status(200).json({
        success: true,
        message: 'Travel record updated successfully',
        data: sanitiseRecord(record),
      });
      return;
    }

    const record = await TravelRecord.create(payload);

    res.status(201).json({
      success: true,
      message: 'Travel record added successfully',
      data: sanitiseRecord(record),
    });
  } catch (error) {
    next(error);
  }
};

// 💠 Get all Travel History (with vehicle, payout, distance, date)
export const getAllTravels = async (req, res, next) => {
  try {
    const records = await TravelRecord.findAll({
      include: {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'role'],
      },
      order: [['date', 'DESC']],
    });

    res.status(200).json({
      success: true,
      data: records.map(sanitiseRecord)
    });
  } catch (error) {
    next(error);
  }
};

// 💠 Get Travel History Month-wise
export const getMonthlyTravels = async (req, res, next) => {
  try {
    const { month, year, user_id } = req.query;

    if (!month || !year)
      return res.status(400).json({ success: false, message: 'Please provide month and year', code: 'VALIDATION_ERROR' });

    const monthNumber = parseInt(month, 10);
    const yearNumber = parseInt(year, 10);

    if (Number.isNaN(monthNumber) || Number.isNaN(yearNumber))
      return res.status(400).json({ success: false, message: 'Month and year must be valid numbers', code: 'VALIDATION_ERROR' });

    const whereClause = {
      [Op.and]: [
        Sequelize.where(Sequelize.fn('MONTH', Sequelize.col('date')), monthNumber),
        Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('date')), yearNumber),
      ],
    };

    if (user_id) whereClause[Op.and].push({ user_id });

    const records = await TravelRecord.findAll({
      where: whereClause,
      include: {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'role'],
      },
      order: [['date', 'DESC']],
    });

    const sanitisedRecords = records.map(sanitiseRecord);

    const summary = sanitisedRecords.reduce(
      (acc, record) => {
        const distance = Number(record.distance_km) || 0;
        const payout = Number(record.payout) || 0;
        const eligibleDistance = record.vehicle_type === ELIGIBLE_VEHICLE_TYPE ? distance : 0;

        acc.totalDistance += distance;
        acc.eligibleDistance += eligibleDistance;
        acc.totalPayout += payout;
        return acc;
      },
      { totalDistance: 0, eligibleDistance: 0, totalPayout: 0 }
    );

    res.status(200).json({
      success: true,
      data: {
        records: sanitisedRecords,
        summary: {
          ...summary,
          ratePerKm: RATE_PER_KM,
        },
      }
    });
  } catch (error) {
    next(error);
  }
};

// 👥 Get all executives (distinct users who have travel records)
export const getAllExecutives = async (req, res, next) => {
  try {
    const executives = await User.findAll({
      include: [
        {
          model: TravelRecord,
          as: 'travels', // ✅ Must match the alias defined in User.hasMany
          attributes: [], // We just want users, not records here
        },
      ],
      attributes: ['id', 'name', 'email', 'role'],
      group: ['User.id'],
      having: Sequelize.literal('COUNT(`travels`.`id`) > 0'),
    });

    res.status(200).json({
      success: true,
      data: executives
    });
  } catch (error) {
    next(error);
  }
};


// 👤 Get travel history for one user
export const getEmployeeTravelHistory = async (req, res, next) => {
  try {
    const { user_id } = req.params;

    const records = await TravelRecord.findAll({
      where: { user_id },
      include: {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'role'],
      },
      order: [['date', 'DESC']],
    });

    res.status(200).json({
      success: true,
      data: records.map(sanitiseRecord)
    });
  } catch (error) {
    next(error);
  }
};
