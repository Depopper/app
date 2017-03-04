const Q			= require('q')
const moment	= require('moment')
const chalk		= require('chalk')
const opts		= require('./opts')
const api		= require('./api')

moment.locale("fr")

var date = moment("2017-03-14")
var startDate = date.clone().startOf("week").format("D-MM-Y")
var endDate = date.clone().endOf("week").add(1, "day").format("D-MM-Y")

const display = (week) => {
	var count = Object.keys(week).reduce((prev, val) => prev += week[val].length, 0)
	for (var day in week) {
		console.log('\n  ' + (week[day].length ? chalk.green(day) : chalk.red(day)))
		console.log('--------------------------------------------------------------------------------------------------')
		if (week[day].length) {
			week[day].forEach((shift) => {
				var start = chalk.green(moment(shift.starts_at).format("kk:mm, D MMMM"))
				var end = chalk.green(moment(shift.ends_at).format("kk:mm, D MMMM"))
				console.log(`            -> starts: ${start} ---- ends: ${end}`)
			})
		} else {
			console.log('            -> empty')
		}
		console.log('--------------------------------------------------------------------------------------------------')
	}
	console.log(`Available shifts: ${count}\n`)
	return week
}

const defaultDay = {
	"AM": [],
	"PM": []
}

const defaultWeek = {
	"LUNDI": [],
	"MARDI": [],
	"MERCREDI": [],
	"JEUDI": [],
	"VENDREDI": [],
	"SAMEDI": [],
	"DIMANCHE": [],
}

const buildWeek = (data) => data.reduce((prev, val) => {
	var startsAt = moment(val.starts_at)
	var day = startsAt.format("dddd").toUpperCase()
	prev[day].push(val)
	return prev
}, Object.assign({}, defaultWeek))

const splitDays = (week) => {
	for (var day in week) {
		var mornings = week[day].filter((day) =>  {
			var h = moment(day.starts_at).hour()
			return  h < 13 && h > 7
		})
		var afternoons = week[day].filter((day) =>  {
			var h = moment(day.starts_at).hour()
			return  h > 13 && h < 24
		})
		week[day] = {
			"AM": mornings,
			"PM": afternoons
		}
	}
	return week
}

const selectAShift = (shifts) => {
	var defer = Q.defer()
	const reserve = (id) => {
		var shift = shifts[id]
		if (!shift) {
			return defer.resolve()
		}
		api.reserveShift(shift.id)
			.then((data) => {
				if (data.state) {
					shift.assigned = true
					console.log("assigned -> " + moment(shift.starts_at).format("D-MM-Y"))
					return defer.resolve()
				} else {
					console.log("WILL TRY NEXT ONE AXEL SCHAFERS")
					return reserve(id + 1)
				}
			}).catch((e) => { console.log(`could not take ${shift.id} !`) })
	}
	reserve(0)
	return defer.promise
}

const reserveShifts = (week) => {
	var promises = []
	for (var day in week) {
		promises.push(selectAShift(week[day]["AM"]))
		promises.push(selectAShift(week[day]["PM"]))
	}
	return Q.all(promises).catch((e) => { console.log(e) })
}

const start = () => {
	return api.getShifts(startDate, endDate, 76011)
		.then((data) => {
			if (!data.length) {
				throw new Error("empty data")
			}
			return data
		})
		.then((data) => data.filter((item) => !item.full && item.desired_coverage > 0))
		.then((data) => data.filter((item) => {
			var h = moment(item.starts_at).hour()
			return (h > 7 && h < 11 || h > 13 && h < 15)
		}))
		.then(buildWeek)
		.then((week) => {
			display(week)
			return week
		})
		.then(splitDays)
		.then(reserveShifts)
		.catch((e) => {
			if (e.message === "empty data") {
				console.log("Empty data, retrying in 500ms")
				return setTimeout(start, 500)
			}	
			else
				throw e
		})
}

start()





