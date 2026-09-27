//Libraries
const express = require('express');
const multer = require('multer');
const mysql = require('mysql2/promise');
const { body, validationResult } = require('express-validator');
//const course = require('./Model/course');

//Setup defaults for script
const app = express();
app.use(express.static('public'))
app.use(express.json())

//Stylesheet
app.use(express.static(__epicgimmproject + '/public'));
//Webpage
app.get('/', (req, res) => {
    res.sendFile(path.join(__epicgimmproject, 'public', 'index.html'));
});


const upload = multer()
const port = 80 //Default port to http server

let connection = null;

async function query(sql, params) {
    //Singleton DB connection
    if (null === connection) {
        console.log('Here');
        connection = await mysql.createConnection({
            host: "student-databases.cvode4s4cwrc.us-west-2.rds.amazonaws.com",
            user: "RYANWELTE",
            password: "e9trkprTqakH8Gw2ExJCmYqoHAiJc56VcSc",
            database: 'RYANWELTE'
        });
    }

    const [results,] = await connection.execute(sql, params);
    return results;
}

//The * in app.* needs to match the method type of the request
app.get(
    '/infiniti_g35_parts/',
    upload.none(),
    async (request, response) => {
        let result = {};
        try {
            let selectSql = `SELECT *, p.id AS part_id
            FROM infiniti_g35_parts p INNER JOIN g35_systems s ON p.system_id = s.id`;

            whereStatements = [],
            orderByStatements = [],
            queryParameters = [];

            if (typeof request.query.name !== 'undefined' && request.query.name.length > 0) {
                whereStatements.push('part_name LIKE ?'); //Column comparison value
                queryParameters.push(`%${request.query.name.trim()}%`); //Value for column comparison
            }

            if (typeof request.query.avg_price !== 'undefined' && request.query.avg_price.length > 0) {
                whereStatements.push('avg_price <= ?');
                queryParameters.push(parseFloat(request.query.avg_price));
            }

            if (typeof request.query.engine_model !== 'undefined' && request.query.engine_model.length > 0) {
                whereStatements.push('engine_model = ?'); //Column comparison value
                queryParameters.push(request.query.engine_model); //Value for column comparison
            }

            if (typeof request.query.transmission_model !== 'undefined' && request.query.transmission_model.length > 0) {
                whereStatements.push('transmission_model = ?'); //Column comparison value
                queryParameters.push(request.query.transmission_model); //Value for column comparison
            }

            if (typeof request.query.body_model !== 'undefined' && request.query.body_model.length > 0) {
                whereStatements.push('body_model = ?'); //Column comparison value
                queryParameters.push(request.query.body_model); //Value for column comparison
            }

            if (typeof request.query.system_name !== 'undefined' && request.query.system_name.length > 0) {
                whereStatements.push('system_name = ?'); //Column comparison value
                queryParameters.push(request.query.system_name); //Value for column comparison
            }
            // if (typeof request.query.year !== 'undefined' && parseInt(request.query.year) !== 0) {
            //     if (typeof request.query.undefined_years !== 'undefined' && request.query.undefined_years === 'on') {
            //         whereStatements.push('(g35_year = ? OR g35_year IS NULL)');
            //     } else {
            //         whereStatements.push('g35_year = ?');
            //     }
            //     queryParameters.push(parseInt(request.query.year));
            // }


            if (typeof request.query.sort !== 'undefined') {
                const sort = request.query.sort;
                if (sort === 'ASC') {
                    orderByStatements.push('avg_price ASC');
                } else if (sort === 'DESC') {
                    orderByStatements.push('avg_price DESC')
                }
            }


            //Dynamically add WHERE expressions to SELECT statements if needed
            if (whereStatements.length > 0) {
                selectSql = selectSql + ' WHERE ' + whereStatements.join(' AND ');
            }

            //Dynamically add ORDER BY expressions to SELECT statements if needed
            if (orderByStatements.length > 0) {
                selectSql = selectSql + ' ORDER BY ' + orderByStatements.join(', ');
            }

            //Dynamically add LIMIT expressions to SELECT statements if needed
            if (typeof request.query.limit !== 'undefined' && request.query.limit > 0 && request.query.limit < 1000) {
                selectSql += ' LIMIT ' + parseInt(request.query.limit, 10);
            }

            result = await query(selectSql, queryParameters);
        } catch (error) {
            console.log(error);
            return response.status(500) //Error code 
                .json({ message: 'Something went wrong with the server.' });
        }
        //Default response object
        response.json({ 'data': result });
    });


//Fetch systems dropdown
app.get(
    '/g35_systems/',
    upload.none(),
    async (request, response) => {
        let result = {};
        try {
            const selectSql = `SELECT id, system_name FROM g35_systems`;
            result = await query(selectSql, []);
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Something went wrong with the server.' });
        }
        response.json({ 'data': result });
    }
);

//INSERT Validation
app.post(
    '/infiniti_g35_parts/',
    upload.none(),
    body('part_name')
        .trim()
        .notEmpty().withMessage('Part name is required.')
        .isLength({ min: 1, max: 255 }).withMessage('Part name must be between 1 and 255 characters.'),
    body('avg_price')
        .notEmpty().withMessage('Average price is required.')
        .isFloat({ min: 0 }).withMessage('Average price must be a positive number.'),
    body('engine_model')
        .optional({ checkFalsy: true })
        .isIn(['VQ35DE', 'VQ35HR']).withMessage('Invalid engine model.'),
    body('transmission_model')
        .optional({ checkFalsy: true })
        .isIn(['Automatic', 'Manual']).withMessage('Invalid transmission model.'),
    body('body_model')
        .optional({ checkFalsy: true })
        .isIn(['Sedan', 'Coupe']).withMessage('Invalid body model.'),
    body('system_id')
        .notEmpty().withMessage('System ID is required.')
        .isInt({ min: 1 }).withMessage('System ID must be a valid integer.'),
    async (request, response) => {
        let result = {};
        try {
            const errors = validationResult(request);
            if (!errors.isEmpty()) {
                const firstError = errors.array()[0];
                const errorMsg = firstError.msg;
                return response.status(400).json({ message: errorMsg });
            }

            const { part_name, avg_price, engine_model, transmission_model, body_model, system_id } = request.body;

            const insertSql = `INSERT INTO infiniti_g35_parts 
                (part_name, avg_price, engine_model, transmission_model, body_model, system_id) 
                VALUES (?, ?, ?, ?, ?, ?)`;

            const queryParameters = [part_name, avg_price, engine_model || null, transmission_model || null, body_model || null, system_id];

            result = await query(insertSql, queryParameters);

            response.status(201).json({ message: 'Part added successfully.', id: result.insertId });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Something went wrong with the server.' });
        }
    }
);


//UPDATE Stuff Below

//Get specific part for updating
app.get(
    '/infiniti_g35_parts/:id/',
    upload.none(),
    async (request, response) => {
        try {
            const id = request.params.id;
            
            // Fetch the specific part
            const selectSql = `SELECT * FROM infiniti_g35_parts WHERE id = ?`;
            const result = await query(selectSql, [id]);

            if (result.length === 0) {
                return response.status(404).json({ message: 'Part not found' });
            }

            response.json({ 'data': result });
        } catch (error) {
            console.error('Error fetching part:', error);
            return response.status(500).json({ message: 'Something went wrong with the server.' });
        }
    }
);

app.put(
    '/infiniti_g35_parts/:id/',
    upload.none(),
    body('part_name')
        .trim()
        .notEmpty().withMessage('Part name is required.')
        .isLength({ min: 1, max: 255 }).withMessage('Part name must be between 1 and 255 characters.'),
    body('avg_price')
        .notEmpty().withMessage('Average price is required.')
        .isFloat({ min: 0 }).withMessage('Average price must be a positive number.'),
    body('engine_model')
        .optional({ checkFalsy: true })
        .isIn(['VQ35DE', 'VQ35HR']).withMessage('Invalid engine model.'),
    body('transmission_model')
        .optional({ checkFalsy: true })
        .isIn(['Automatic', 'Manual']).withMessage('Invalid transmission model.'),
    body('body_model')
        .optional({ checkFalsy: true })
        .isIn(['Sedan', 'Coupe']).withMessage('Invalid body model.'),
    body('system_id')
        .notEmpty().withMessage('System ID is required.')
        .isInt({ min: 1 }).withMessage('System ID must be a valid integer.'),
    async (request, response) => {
        // Validate request
        const errors = validationResult(request);
        if (!errors.isEmpty()) {
            return response
                .status(400)
                .json({
                    message: 'Request fields or files are invalid.',
                    errors: errors.array(),
                });
        }

        try {
            const id = request.params.id;
            const { part_name, avg_price, engine_model, transmission_model, body_model, system_id } = request.body;

            // Construct the SQL UPDATE statement
            const updateSql = `
                UPDATE infiniti_g35_parts 
                SET part_name = ?, avg_price = ?, engine_model = ?, 
                    transmission_model = ?, body_model = ?, system_id = ? 
                WHERE id = ?
            `;

            const queryParameters = [
                part_name, 
                avg_price, 
                engine_model || null, 
                transmission_model || null, 
                body_model || null, 
                system_id, 
                id
            ];

            // Execute the query using the existing helper
            const result = await query(updateSql, queryParameters);

            if (result.affectedRows === 0) {
                return response.status(404).json({ message: 'Part not found.' });
            }

            response.json({ 'data': 'Entry updated!', id: id });
        } catch (error) {
            console.error('Update error:', error);
            return response
                .status(500)
                .json({ message: 'Something went wrong with the server.' });
        }
    }
);

app.listen(port, () => {
    console.log(`Application listening at http://localhost:${port}`);
})