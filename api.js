const axios	= require('axios')

const KEY =  process.env['STUART_KEY'] 
const URI =  process.env['STUART_URI']


const api = axios.create({
	baseURL: URI,
	timeout: 1000,
	headers: {
		'Authorization': 'Basic ' + KEY,
		'User-Agent': 'Depopper'
	}
})

exports.getShifts = (start, end, arround) => new Promise((res, rej) => {
	var opts = {
		from: start,
		until: end,
		timeout: 2000
	}

	if (arround) {
		opts.department_ids = arround
	}
		
	api.get('shifts.json', {
		data: opts
	}).then((response) => res(response.data))
})

exports.reserveShift = (shiftId) => api.post('applications.json', {
	attended: true,
	do: "assign",
	duration: 0,
	shift_id: shiftId,
	userFullName: "axel schafers",
	user_id: 252322
})