import { PortedConfig } from "simulation/ai/ConquestAI/portedConfig.js";
import { postAttackWalk, postTrain, postWalk } from "simulation/ai/ConquestAI/commands.js";
import {
	getTemplateCategory,
	getTemplateCost
} from "simulation/ai/ConquestAI/templateInfo.js";

export function MilitaryManager(data)
{
	this.trainCursor = data && data.trainCursor || 0;
	this.unitCursors = data && data.unitCursors || {};
	this.lastRallyTime = data && data.lastRallyTime || -Infinity;
	this.mode = data && data.mode || "rally";
	this.attackTargetId = data && data.attackTargetId;
	this.attackGroupIds = data && data.attackGroupIds || [];
	this.attackWaveCount = data && data.attackWaveCount || 0;
	this.attackMinUnits = data && data.attackMinUnits;
	this.attackCooldownUntil = data && data.attackCooldownUntil || -Infinity;
	this.defensePoint = data && data.defensePoint;
	this.defenseUntil = data && data.defenseUntil || -Infinity;
	this.lastAttackOrderTime = data && data.lastAttackOrderTime || -Infinity;
	this.lastDefenseOrderTime = data && data.lastDefenseOrderTime || -Infinity;
}

MilitaryManager.prototype.Serialize = function()
{
	return {
		"trainCursor": this.trainCursor,
		"unitCursors": this.unitCursors,
		"lastRallyTime": this.lastRallyTime,
		"mode": this.mode,
		"attackTargetId": this.attackTargetId,
		"attackGroupIds": this.attackGroupIds,
		"attackWaveCount": this.attackWaveCount,
		"attackMinUnits": this.attackMinUnits,
		"attackCooldownUntil": this.attackCooldownUntil,
		"defensePoint": this.defensePoint,
		"defenseUntil": this.defenseUntil,
		"lastAttackOrderTime": this.lastAttackOrderTime,
		"lastDefenseOrderTime": this.lastDefenseOrderTime
	};
};

MilitaryManager.prototype.update = function(gameState, player, elapsedTime, events)
{
	if (!gameState || !gameState.getOwnEntities)
		return;

	this.trainMilitaryUnits(gameState, player);
	this.updateDefenseState(gameState, player, elapsedTime, events);

	if (this.mode == "defend")
	{
		this.defendBase(gameState, player, elapsedTime);
		return;
	}

	if (this.mode == "attack")
	{
		this.continueAttack(gameState, player, elapsedTime);
		return;
	}

	if (this.tryStartAttack(gameState, player, elapsedTime))
		return;

	this.rallyArmy(gameState, player, elapsedTime);
};

MilitaryManager.prototype.trainMilitaryUnits = function(gameState, player)
{
	let queuedMilitary = this.countQueuedMilitary(gameState);
	if (queuedMilitary >= PortedConfig.maxQueuedMilitary)
		return;

	const facilities = this.getMilitaryTrainingFacilities(gameState);
	if (!facilities.length)
		return;

	let trained = false;
	for (let i = 0; i < facilities.length; ++i)
	{
		const facility = facilities[(this.trainCursor + i) % facilities.length];
		if (this.countQueuedMilitaryInFacility(facility) >= PortedConfig.maxQueuedMilitaryPerFacility)
			continue;

		const template = this.getMilitaryUnitTemplate(gameState, facility);
		if (!template || !this.canAffordTemplate(gameState, template))
			continue;

		postTrain(player, facility, template, PortedConfig.militaryTrainBatchSize || 1);
		this.advanceUnitCursor(facility);
		queuedMilitary += PortedConfig.militaryTrainBatchSize || 1;
		trained = true;

		if (queuedMilitary >= PortedConfig.maxQueuedMilitary)
			break;
	}

	if (trained)
		this.trainCursor = (this.trainCursor + 1) % facilities.length;
};

MilitaryManager.prototype.getMilitaryTrainingFacilities = function(gameState)
{
	const facilities = gameState.getOwnTrainingFacilities();
	if (!facilities || !facilities.hasEntities())
		return [];

	const result = [];
	for (const facility of facilities.values())
		if (facility.templateName &&
			this.isMilitaryProductionTemplate(gameState, facility.templateName()) &&
			this.hasMilitaryTrainableEntities(gameState, facility))
			result.push(facility);

	return result;
};

MilitaryManager.prototype.getMilitaryUnitTemplate = function(gameState, facility)
{
	const trainable = this.getTrainableEntities(gameState, facility);
	if (!trainable.length)
		return undefined;

	const cursor = this.getUnitCursor(facility);
	for (let i = 0; i < trainable.length; ++i)
	{
		const template = trainable[(cursor + i) % trainable.length];
		if (this.isMilitaryUnitTemplate(template))
			return template;
	}
	return undefined;
};

MilitaryManager.prototype.hasMilitaryTrainableEntities = function(gameState, facility)
{
	const trainable = this.getTrainableEntities(gameState, facility);
	for (const template of trainable)
		if (this.isMilitaryUnitTemplate(template))
			return true;
	return false;
};

MilitaryManager.prototype.getTrainableEntities = function(gameState, facility)
{
	if (!facility || !facility.trainableEntities)
		return [];

	const civ = gameState.getPlayerCiv ? gameState.getPlayerCiv() : undefined;
	return facility.trainableEntities(civ) || [];
};

MilitaryManager.prototype.getUnitCursor = function(facility)
{
	const key = String(facility.id());
	return this.unitCursors[key] || 0;
};

MilitaryManager.prototype.advanceUnitCursor = function(facility)
{
	const key = String(facility.id());
	this.unitCursors[key] = (this.unitCursors[key] || 0) + 1;
};

MilitaryManager.prototype.countQueuedMilitary = function(gameState)
{
	const facilities = gameState.getOwnTrainingFacilities();
	if (!facilities || !facilities.hasEntities())
		return 0;

	let count = 0;
	for (const facility of facilities.values())
	{
		const queue = facility.trainingQueue && facility.trainingQueue();
		if (!queue)
			continue;

		for (const item of queue)
		{
			const template = item.template || item.unitTemplate;
			if (this.isMilitaryUnitTemplate(template))
				count += item.count || item.batchCount || 1;
		}
	}
	return count;
};

MilitaryManager.prototype.countQueuedMilitaryInFacility = function(facility)
{
	const queue = facility.trainingQueue && facility.trainingQueue();
	if (!queue)
		return 0;

	let count = 0;
	for (const item of queue)
	{
		const template = item.template || item.unitTemplate;
		if (this.isMilitaryUnitTemplate(template))
			count += item.count || item.batchCount || 1;
	}
	return count;
};

MilitaryManager.prototype.updateDefenseState = function(gameState, player, elapsedTime, events)
{
	const attacked = events && events.Attacked;
	if (!attacked || !attacked.length)
	{
		if (this.mode == "defend" && elapsedTime > this.defenseUntil)
			this.mode = "rally";
		return;
	}

	for (const evt of attacked)
	{
		const victim = gameState.getEntityById && gameState.getEntityById(evt.target);
		if (!victim || !victim.owner || victim.owner() != player)
			continue;

		if (!this.shouldDefendVictim(gameState, victim))
			continue;

		const attacker = gameState.getEntityById && gameState.getEntityById(evt.attacker);
		if (!attacker || !attacker.position || !attacker.position())
			continue;

		const attackerOwner = attacker.owner ? attacker.owner() : evt.attackerOwner;
		if (attackerOwner === undefined || !gameState.isPlayerEnemy || !gameState.isPlayerEnemy(attackerOwner))
			continue;

		this.mode = "defend";
		this.attackTargetId = undefined;
		this.attackGroupIds = [];
		this.defensePoint = attacker.position();
		this.defenseUntil = elapsedTime + PortedConfig.militaryDefenseDurationSeconds;
		return;
	}

	if (this.mode == "defend" && elapsedTime > this.defenseUntil)
		this.mode = "rally";
};

MilitaryManager.prototype.shouldDefendVictim = function(gameState, victim)
{
	if (victim.hasClass && victim.hasClass("Structure"))
		return true;

	const victimPos = victim.position && victim.position();
	if (!victimPos)
		return false;

	const anchor = this.getRallyAnchor(gameState);
	if (!anchor)
		return false;

	const maxDist = PortedConfig.militaryDefenseBaseRadius *
		PortedConfig.militaryDefenseBaseRadius;
	return this.distanceSquared(victimPos, anchor) <= maxDist;
};

MilitaryManager.prototype.defendBase = function(gameState, player, elapsedTime)
{
	if (!this.defensePoint)
	{
		this.mode = "rally";
		return;
	}

	if (elapsedTime - this.lastDefenseOrderTime < PortedConfig.militaryDefenseOrderIntervalSeconds)
		return;

	const units = this.getArmyUnitIds(gameState);
	if (!units.length)
		return;

	postAttackWalk(player, units, this.defensePoint, false);
	this.lastDefenseOrderTime = elapsedTime;
};

MilitaryManager.prototype.tryStartAttack = function(gameState, player, elapsedTime)
{
	if (elapsedTime < this.attackCooldownUntil)
		return false;

	this.ensureAttackMinUnits(gameState);

	const units = this.getReadyAttackGroupIds(gameState);
	if (units.length < this.attackMinUnits)
		return false;

	const target = this.findAttackTarget(gameState);
	if (!target || !target.position || !target.position())
		return false;

	this.mode = "attack";
	this.attackTargetId = target.id();
	this.attackGroupIds = units.slice();
	++this.attackWaveCount;
	this.issueAttackOrder(player, this.attackGroupIds, target.position(), elapsedTime);
	return true;
};

MilitaryManager.prototype.getReadyAttackGroupIds = function(gameState)
{
	const rally = this.getRallyPoint(gameState);
	if (!rally)
		return [];

	const ownUnits = gameState.getOwnUnits();
	if (!ownUnits || !ownUnits.hasEntities())
		return [];

	const units = [];
	const maxDist = PortedConfig.militaryAttackGatherRadius *
		PortedConfig.militaryAttackGatherRadius;
	for (const unit of ownUnits.values())
	{
		if (!this.isArmyUnit(unit))
			continue;

		const pos = unit.position && unit.position();
		if (pos && this.distanceSquared(pos, rally) <= maxDist)
			units.push(unit.id());
	}
	return units;
};

MilitaryManager.prototype.continueAttack = function(gameState, player, elapsedTime)
{
	const target = this.attackTargetId && gameState.getEntityById && gameState.getEntityById(this.attackTargetId);
	if (!target || !target.position || !target.position())
	{
		this.mode = "rally";
		this.attackTargetId = undefined;
		this.attackGroupIds = [];
		this.attackMinUnits = undefined;
		return;
	}

	if (elapsedTime - this.lastAttackOrderTime < PortedConfig.militaryAttackOrderIntervalSeconds)
		return;

	const units = this.getActiveAttackGroupIds(gameState);
	if (units.length < Math.max(1, Math.floor(this.attackMinUnits / 2)))
	{
		this.endAttackWave(elapsedTime, true);
		return;
	}

	this.issueAttackOrder(player, units, target.position(), elapsedTime);
};

MilitaryManager.prototype.endAttackWave = function(elapsedTime, useCooldown)
{
	this.mode = "rally";
	this.attackTargetId = undefined;
	this.attackGroupIds = [];
	this.attackMinUnits = undefined;

	if (useCooldown)
		this.attackCooldownUntil = elapsedTime + PortedConfig.militaryAttackWaveCooldownSeconds;
};

MilitaryManager.prototype.ensureAttackMinUnits = function(gameState)
{
	if (!this.attackMinUnits)
		this.attackMinUnits = this.rollAttackMinUnits(gameState);
};

MilitaryManager.prototype.rollAttackMinUnits = function(gameState)
{
	let base = PortedConfig.militaryAttackMinUnits || 1;
	base += this.attackWaveCount * (PortedConfig.militaryAttackWaveGrowthUnits || 0);

	if (PortedConfig.militaryAttackMaxUnits)
		base = Math.min(base, PortedConfig.militaryAttackMaxUnits);

	const variance = PortedConfig.militaryAttackMinUnitsVariance || 0;
	if (!variance)
		return Math.max(1, base);

	const min = Math.max(1, base - variance);
	const max = PortedConfig.militaryAttackMaxUnits ?
		Math.min(PortedConfig.militaryAttackMaxUnits, base + variance) :
		base + variance;
	return randIntInclusive(min, Math.max(min, max));
};

MilitaryManager.prototype.issueAttackOrder = function(player, units, targetPos, elapsedTime)
{
	postAttackWalk(player, units, targetPos, true);
	this.lastAttackOrderTime = elapsedTime;
};

MilitaryManager.prototype.getActiveAttackGroupIds = function(gameState)
{
	if (!this.attackGroupIds || !this.attackGroupIds.length)
		return [];

	const units = [];
	for (const id of this.attackGroupIds)
	{
		const unit = gameState.getEntityById && gameState.getEntityById(id);
		if (unit && this.isArmyUnit(unit))
			units.push(id);
	}
	this.attackGroupIds = units;
	return units;
};

MilitaryManager.prototype.findAttackTarget = function(gameState)
{
	const enemies = gameState.getEnemies ? gameState.getEnemies() : [];
	for (const enemy of enemies)
	{
		if (!enemy)
			continue;

		const structures = gameState.getEnemyStructures && gameState.getEnemyStructures(enemy);
		const target = this.findPreferredTargetInCollection(structures);
		if (target)
			return target;

		const units = gameState.getEnemyUnits && gameState.getEnemyUnits(enemy);
		const unitTarget = this.findPreferredTargetInCollection(units);
		if (unitTarget)
			return unitTarget;
	}
	return undefined;
};

MilitaryManager.prototype.findPreferredTargetInCollection = function(collection)
{
	if (!collection || !collection.hasEntities || !collection.hasEntities())
		return undefined;

	let fallback;
	for (const ent of collection.values())
	{
		if (!ent.position || !ent.position())
			continue;

		if (!fallback)
			fallback = ent;

		if (ent.hasClass && (ent.hasClass("CivCentre") || ent.hasClass("CivilCentre")))
			return ent;
	}
	return fallback;
};

MilitaryManager.prototype.rallyArmy = function(gameState, player, elapsedTime)
{
	if (elapsedTime - this.lastRallyTime < PortedConfig.militaryRallyIntervalSeconds)
		return;

	const rally = this.getRallyPoint(gameState);
	if (!rally)
		return;

	const units = this.getIdleArmyUnits(gameState, rally);
	if (!units.length)
		return;

	postWalk(player, units, rally);
	this.lastRallyTime = elapsedTime;
};

MilitaryManager.prototype.getIdleArmyUnits = function(gameState, rally)
{
	const ownUnits = gameState.getOwnUnits();
	if (!ownUnits || !ownUnits.hasEntities())
		return [];

	const units = [];
	const maxDist = PortedConfig.militaryRallyRadius * PortedConfig.militaryRallyRadius;
	for (const unit of ownUnits.values())
	{
		if (!this.isArmyUnit(unit))
			continue;

		if (!unit.isIdle || !unit.isIdle())
			continue;

		const pos = unit.position && unit.position();
		if (!pos || this.distanceSquared(pos, rally) <= maxDist)
			continue;

		units.push(unit.id());
	}
	return units;
};

MilitaryManager.prototype.getArmyUnitIds = function(gameState)
{
	const ownUnits = gameState.getOwnUnits();
	if (!ownUnits || !ownUnits.hasEntities())
		return [];

	const units = [];
	for (const unit of ownUnits.values())
		if (this.isArmyUnit(unit))
			units.push(unit.id());

	return units;
};

MilitaryManager.prototype.getRallyPoint = function(gameState)
{
	const anchor = this.getRallyAnchor(gameState);
	if (!anchor)
		return undefined;

	return [anchor[0] + PortedConfig.militaryRallyOffset, anchor[1]];
};

MilitaryManager.prototype.getRallyAnchor = function(gameState)
{
	const structures = gameState.getOwnStructures();
	if (!structures || !structures.hasEntities())
		return undefined;

	let fallback;
	for (const structure of structures.values())
	{
		const pos = structure.position && structure.position();
		if (!pos)
			continue;

		if (!fallback)
			fallback = pos;

		if (structure.templateName && this.isMilitaryProductionTemplate(gameState, structure.templateName()))
			return pos;

		if (structure.hasClass && (structure.hasClass("CivCentre") || structure.hasClass("CivilCentre")))
			fallback = pos;
	}
	return fallback;
};

MilitaryManager.prototype.isArmyUnit = function(unit)
{
	if (!unit.templateName || !this.isMilitaryUnitTemplate(unit.templateName()))
		return false;

	if (!unit.hasClass)
		return true;

	const excludedClasses = PortedConfig.militaryUnitClassExcludes || [];
	for (const className of excludedClasses)
		if (unit.hasClass(className))
			return false;

	return true;
};

MilitaryManager.prototype.isMilitaryUnitTemplate = function(templateName)
{
	if (!templateName)
		return false;

	const lower = String(templateName).toLowerCase();
	if (lower.indexOf("foundation|") === 0 || lower.indexOf("structures/") === 0)
		return false;

	for (const keyword of PortedConfig.militaryUnitTemplateExcludes)
		if (lower.indexOf(keyword) !== -1)
			return false;

	return lower.indexOf("units/") === 0;
};

MilitaryManager.prototype.isMilitaryProductionTemplate = function(gameState, templateName)
{
	if (!templateName)
		return false;

	const cleanName = templateName.indexOf("foundation|") === 0 ?
		templateName.substring("foundation|".length) :
		templateName;
	const category = getTemplateCategory(gameState, cleanName);
	if (category == "Barracks")
		return true;

	const lower = String(cleanName).toLowerCase();
	return lower.indexOf("_barracks") !== -1 ||
		lower.endsWith("/barracks") ||
		lower.indexOf("_stable") !== -1 ||
		lower.indexOf("_stables") !== -1 ||
		lower.indexOf("_mercs") !== -1;
};

MilitaryManager.prototype.canAffordTemplate = function(gameState, templateName)
{
	const costs = getTemplateCost(gameState, templateName);
	if (!costs)
		return true;

	const resources = gameState.getResources && gameState.getResources();
	if (!resources)
		return true;

	for (const resource in costs)
		if ((resources[resource] || 0) < costs[resource])
			return false;

	return true;
};

MilitaryManager.prototype.distanceSquared = function(a, b)
{
	const dx = a[0] - b[0];
	const dz = a[1] - b[1];
	return dx * dx + dz * dz;
};
