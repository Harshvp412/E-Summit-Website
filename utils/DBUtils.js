const Q = require("q");

const DBUtils = () => {
	const saveEntity = (entity) => {
		const deferred = Q.defer();
		entity.save((err) => {
			if (err) {
				console.error("Error in inserting entity for " + entity.collection.name, err);
				deferred.reject(err);
			}
			//console.log(`${entity.collection.name.slice(0, -1)} saved`);
			deferred.resolve();
		});
		return deferred.promise;
	};

	const getEntityForIds = (entity, enitityIds) => {
		const deferred = Q.defer();
		entity
			.find({ _id: { $in: enitityIds } })
			.then((results) => {
				deferred.resolve(results);
			})
			.catch((err) => {
				console.error("Error in fetching entities for " + entity.collection.name, err);
				deferred.resolve();
			});
		return deferred.promise;
	};

	// const getEntities = (entity, enitityIds) => {
	// 	const deferred = Q.defer();
	// 	entity
	// 		.find({ _id: { $in: enitityIds } })
	// 		.then(results => {
	// 			deferred.resolve(results);
	// 		})
	// 		.catch(err => {
	// 			console.error(
	// 				"Error in fetching entities for " + entity.collection.name,
	// 				err
	// 			);
	// 			deferred.resolve();
	// 		});
	// 	return deferred.promise;
	// };

	const getEntityForId = (entity, id) => {
		const deferred = Q.defer();
		entity
			.findById(id)
			.then((entityInstance) => {
				deferred.resolve(entityInstance);
			})
			.catch((err) => {
				console.error("Error in fetching entity for " + entity.collection.name, err);
				deferred.resolve();
			});
		return deferred.promise;
	};

	const upsertEntity = (entity, query, newObject) => {
		let docToUpdate = {};
		docToUpdate = Object.assign(docToUpdate, newObject._doc);
		delete docToUpdate._id;
		const deferred = Q.defer();
		entity
			.findOneAndUpdate(query, docToUpdate, { upsert: true })
			.then(() => {
				//console.log(`${entity.collection.name.slice(0, -1)} upserted`);
				deferred.resolve();
			})
			.catch((err) => {
				console.error("Error in upserting " + entity.collection.name, err);
				deferred.resolve();
			});
		return deferred.promise;
	};

	const getAllEntities = (entity, query) => {
		const deferred = Q.defer();
		entity
			.find(query)
			.then((results) => {
				deferred.resolve(results);
			})
			.catch((err) => {
				deferred.reject(err);
			});

		return deferred.promise;
	};

	const getEntities = (entity, query, start, size) => {
		const deferred = Q.defer();
		entity
			.find(query)
			.skip(start)
			.limit(size)
			.then((results) => {
				deferred.resolve(results);
			})
			.catch((err) => {
				deferred.reject(err);
			});

		return deferred.promise;
	};

	const bulkInsertEntities = (entity, objects) => {
		const deferred = Q.defer();
		entity
			.insertMany(objects)
			.then(() => {
				deferred.resolve();
			})
			.catch((err) => {
				deferred.reject(err);
			});

		return deferred.promise;
	};

	const bulkUpsert = async (entity, objects) => {
		for (let i = 0; i < objects.length; i++) {
			try {
				let filter = {};
				if (entity.modelName == "AccountReceivable") {
					filter = {
						organizationId: objects[i].organizationId,
						customerQuickbookId: objects[i].customerQuickbookId,
					};
				} else if (entity.modelName == "MonthlyCustomerStat") {
					filter = {
						organizationId: objects[i].organizationId,
						customerQuickbookId: objects[i].customerQuickbookId,
						month: objects[i].month,
						year: objects[i].year,
					};
				} else if (entity.modelName == "MonthlyProductStat") {
					filter = {
						organizationId: objects[i].organizationId,
						itemQuickbookId: objects[i].itemQuickbookId,
						month: objects[i].month,
						year: objects[i].year,
					};
				} else if (entity.modelName == "MonthlyPnL") {
					filter = {
						organizationId: objects[i].organizationId,
						month: objects[i].month,
						year: objects[i].year,
					};
				} else if (entity.modelName == "Invoice") {
					filter = {
						organizationId: objects[i].organizationId,
						quickbookId: objects[i].quickbookId,
					};
				} else if (entity.modelName == "Customer") {
					filter = {
						organizationId: objects[i].organizationId,
						quickbookId: objects[i].quickbookId,
					};
				} else if (entity.modelName == "Item") {
					filter = {
						organizationId: objects[i].organizationId,
						id: objects[i].id,
					};
				}
				await upsertEntity(entity, filter, objects[i]);
			} catch (err) {
				console.error("Error in upserting entity: " + err);
			}
		}
	};

	const runAggregation = (entity, aggregation) => {
		const deferred = Q.defer();

		entity
			.aggregate(aggregation)
			.then((results) => {
				deferred.resolve(results);
			})
			.catch((err) => {
				deferred.reject("Error in running aggregation " + err);
			});
		return deferred.promise;
	};

	const getEntity = (entity, filter) => {
		const deferred = Q.defer();

		entity
			.findOne(filter)
			.then((result) => {
				deferred.resolve(result);
			})
			.catch((err) => {
				deferred.reject("Error in finding entity " + err);
			});
		return deferred.promise;
	};

	const deleteEntityById = (entity, id) => {
		const deferred = Q.defer();

		entity
			.findByIdAndRemove(id)
			.then(() => {
				deferred.resolve();
			})
			.catch((err) => {
				deferred.reject("Error in deleting entity " + err);
			});
		return deferred.promise;
	};

	const getCount = (entity, query) => {
		const deferred = Q.defer();

		entity
			.count(query)
			.then((result) => {
				deferred.resolve(result);
			})
			.catch((err) => {
				deferred.reject("Error in getting count " + err);
			});

		return deferred.promise;
	};

	const updateEntity = (entity, query, update) => {
		const deferred = Q.defer();
		entity
			.updateOne(query, update)
			.then((result) => {
				//console.log(`${entity.collection.name.slice(0, -1)} updated`);
				deferred.resolve();
			})
			.catch((err) => {
				deferred.reject(err);
			});

		return deferred.promise;
	};

	return {
		saveEntity,
		getEntityForIds,
		getEntityForId,
		upsertEntity,
		getEntities,
		bulkInsertEntities,
		bulkUpsert,
		getAllEntities,
		runAggregation,
		getEntity,
		deleteEntityById,
		getCount,
		updateEntity,
	};
};

module.exports = DBUtils;
