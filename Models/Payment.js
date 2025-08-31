import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
	{
		team: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Team',
			required: [true, 'Team is required'],
			index: true,
		},
		session: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Session',
			required: [true, 'Session is required'],
			index: true,
		},
		subjectType: {
			type: String,
			enum: ['player', 'coach'],
			required: [true, 'Subject type is required'],
			index: true,
		},
		subject: {
			type: mongoose.Schema.Types.ObjectId,
			refPath: 'subjectType',
			required: [true, 'Subject is required'],
			index: true,
		},
		year: {
			type: Number,
			required: [true, 'Year is required'],
			min: 2000,
			max: 2100,
		},
		month: {
			type: Number,
			required: [true, 'Month is required'],
			min: 1,
			max: 12,
		},
		amount: {
			type: Number,
			default: 0,
			min: [0, 'Amount cannot be negative'],
		},
		inscriptionIncluded: {
			type: Boolean,
			default: false,
		},
		inscriptionAmount: {
			type: Number,
			default: 0,
			min: [0, 'Inscription amount cannot be negative'],
		},
		status: {
			type: String,
			enum: ['paid', 'pending', 'delayed', 'unpaid'],
			default: 'pending',
		},
		paidAt: {
			type: Date,
			default: null,
		},
		notes: {
			type: String,
			default: '',
		},
	},
	{ timestamps: true }
);

paymentSchema.index(
	{ session: 1, subjectType: 1, subject: 1, year: 1, month: 1 },
	{ unique: true }
);

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;


