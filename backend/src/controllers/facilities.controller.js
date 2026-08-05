import { query } from '../config/db.js'

export async function getFacilities(req, res, next) {
  try {
    const result = await query('SELECT * FROM facilities ORDER BY name ASC')
    res.json(result.rows)
  } catch (err) {
    next(err)
  }
}

export async function createFacility(req, res, next) {
  try {
    const { name, county, sub_county, lat, lng, phone } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Facility name is required' })
    }

    const parsedLat = lat === '' || lat == null ? null : parseFloat(lat)
    const parsedLng = lng === '' || lng == null ? null : parseFloat(lng)

    const result = await query(
      `INSERT INTO facilities (name, county, sub_county, lat, lng, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name.trim(),
        county || null,
        sub_county || null,
        Number.isFinite(parsedLat) ? parsedLat : null,
        Number.isFinite(parsedLng) ? parsedLng : null,
        phone || null,
      ]
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    next(err)
  }
}
