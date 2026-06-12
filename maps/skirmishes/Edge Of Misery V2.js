{
	let cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);

	cmpTrigger.eom = {
		"wave": 0,
		"maxWave": 10,
		"victoryAwarded": false,
		"enemyPlayer": 3,
		"survivorPlayers": [1, 2],
		"firstWaveDelay": 200 * 1000,
		"waveInterval": 180 * 1000,
		"retargetInterval": 25 * 1000,
		"activeWave": [],
		"spawnPointLabels": ["M", "N", "O", "P"],
		"larvaCoreBudgetRatio": 0.25,
		"larvaCoreTemplates": [
			"units/gohma/gohma_larva_soldier_b",
			"units/gohma/gohma_larva_hive_b"
		],
		"fallbackTargets": [
			{ "x": 395, "z": 258 },
			{ "x": 883, "z": 228 }
		],
		"spawnPoints": [
			{ "x": 320, "z": 1130 },
			{ "x": 520, "z": 1195 },
			{ "x": 760, "z": 1195 },
			{ "x": 970, "z": 1130 }
		],
		"roster": [
			{ "template": "units/gohma/gohma_larva_soldier_b", "minWave": 1, "cost": 1 },
			{ "template": "units/gohma/gohma_larva_hive_b", "minWave": 1, "cost": 1 },
			{ "template": "units/gohma/gohma_burst_b", "minWave": 2, "cost": 3 },
			{ "template": "units/gohma/gohma_longlegs_b", "minWave": 2, "cost": 5 },
			{ "template": "units/gohma/gohma_acidsprayer_b", "minWave": 3, "cost": 5 },
			{ "template": "units/gohma/gohma_rocktite_b", "minWave": 4, "cost": 6 },
			{ "template": "units/gohma/gohma_tank_b", "minWave": 4, "cost": 8 },
			{ "template": "units/gohma/gohma_shieldgohma_b", "minWave": 5, "cost": 9 },
			{ "template": "units/gohma/gohma_spinalgohma_b", "minWave": 5, "cost": 9 },
			{ "template": "units/gohma/gohma_shroudwalker", "minWave": 5, "cost": 9 , "maxPerWave": 2 },
			{ "template": "units/gohma/gohma_armogohma_b", "minWave": 6, "cost": 9 },
			{ "template": "units/gohma/gohma_princess_b", "minWave": 6, "cost": 18, "maxPerWave": 2 },
			{ "template": "units/gohma/gohma_queen_b", "minWave": 7, "cost": 30, "maxPerWave": 1 },
			{ "template": "units/gohma/gohma_hero_sulkaris", "minWave": 7, "cost": 20, "maxPerWave": 2 },
			{ "template": "units/gohma/gohma_titan_iemanis_electric", "minWave": 10, "cost": 35, "maxPerWave": 1 }
		]
	};

	cmpTrigger.DoAfterDelay(1000, "EOMInitSurvival", {});
}

Trigger.prototype.EOMInitSurvival = function()
{
	this.EOMLoadMapSpawnPoints();
	this.EOMSetDiplomacy();
	this.DoAfterDelay(this.eom.firstWaveDelay, "EOMSpawnNextWave", {});
};

Trigger.prototype.EOMLoadMapSpawnPoints = function()
{
	let points = [];

	for (let label of this.eom.spawnPointLabels)
	{
		let entities = this.GetTriggerPoints(label);
		for (let ent of entities)
		{
			let cmpPosition = Engine.QueryInterface(ent, IID_Position);
			if (!cmpPosition || !cmpPosition.IsInWorld())
				continue;

			let pos = cmpPosition.GetPosition2D();
			points.push({ "x": pos.x, "z": pos.y });
		}
	}

	if (points.length)
		this.eom.spawnPoints = points;
};

Trigger.prototype.EOMSetDiplomacy = function()
{
	let enemy = this.eom.enemyPlayer;
	let survivors = this.eom.survivorPlayers;

	for (let player of survivors)
	{
		for (let ally of survivors)
			if (player != ally)
				ProcessCommand(player, { "type": "diplomacy", "player": ally, "to": "ally" });

		ProcessCommand(player, { "type": "diplomacy", "player": enemy, "to": "enemy" });
		ProcessCommand(enemy, { "type": "diplomacy", "player": player, "to": "enemy" });
	}
};

Trigger.prototype.EOMSpawnNextWave = function()
{
	this.eom.wave += 1;

	let wave = this.eom.wave;
	let spawned = [];
	let plan = this.EOMBuildWavePlan(wave);
	let spawnIndex = 0;

	for (let entry of plan)
		for (let i = 0; i < entry.count; ++i)
		{
			let point = this.eom.spawnPoints[spawnIndex++ % this.eom.spawnPoints.length];
			let ent = this.EOMSpawnUnit(entry.template, point.x + randIntInclusive(-18, 18), point.z + randIntInclusive(-18, 18));
			if (ent)
				spawned.push(ent);
		}

	if (spawned.length)
	{
		this.eom.activeWave = this.eom.activeWave.concat(spawned);
		this.EOMSetAIStance("aggressive", spawned);
		this.EOMOrderAttack(spawned, false);
	}

	if (wave < this.eom.maxWave)
		this.DoAfterDelay(this.eom.waveInterval, "EOMSpawnNextWave", {});
	else
		this.EOMNotify("This is their final attack! Victory awaits! Kill them all!");
};

Trigger.prototype.EOMBuildWavePlan = function(wave)
{
	let budget = Math.round(20 + 300 * Math.pow(wave / 10, 2));
	let available = this.eom.roster.filter(entry => wave >= entry.minWave);
	let counts = {};
	let safety = 0;
	let larvaBudget = Math.ceil(budget * this.eom.larvaCoreBudgetRatio);
	let larvaEntries = available.filter(entry => this.eom.larvaCoreTemplates.indexOf(entry.template) != -1);

	while (larvaBudget > 0 && budget > 0 && larvaEntries.length && safety++ < 400)
	{
		let affordable = larvaEntries.filter(entry => entry.cost <= budget && entry.cost <= larvaBudget);
		if (!affordable.length)
			break;

		let entry = affordable[randIntInclusive(0, affordable.length - 1)];
		counts[entry.template] = (counts[entry.template] || 0) + 1;
		budget -= entry.cost;
		larvaBudget -= entry.cost;
	}

	while (budget > 0 && safety++ < 400)
	{
		let affordable = available.filter(entry => entry.cost <= budget && (!entry.maxPerWave || (counts[entry.template] || 0) < entry.maxPerWave));
		if (!affordable.length)
			break;

		let entry = affordable[randIntInclusive(0, affordable.length - 1)];
		counts[entry.template] = (counts[entry.template] || 0) + 1;
		budget -= entry.cost;
	}

	let plan = [];
	for (let template in counts)
		plan.push({ "template": template, "count": counts[template] });

	return plan;
};

Trigger.prototype.EOMSpawnUnit = function(template, x, z)
{
	let ent = Engine.AddEntity(template);
	let cmpPosition = Engine.QueryInterface(ent, IID_Position);
	if (!cmpPosition)
	{
		Engine.DestroyEntity(ent);
		return 0;
	}

	let cmpOwnership = Engine.QueryInterface(ent, IID_Ownership);
	if (cmpOwnership)
		cmpOwnership.SetOwner(this.eom.enemyPlayer);

	cmpPosition.JumpTo(x, z);
	cmpPosition.SetYRotation(randFloat(0, Math.PI * 2));
	return ent;
};

Trigger.prototype.EOMRetargetActiveWave = function()
{
	this.eom.activeWave = this.EOMFilterLiveEntities(this.eom.activeWave);
	if (!this.eom.activeWave.length)
	{
		this.EOMCheckFinalVictory();
		return;
	}

	this.EOMOrderAttack(this.eom.activeWave, false);
	this.DoAfterDelay(this.eom.retargetInterval, "EOMRetargetActiveWave", {});
};

Trigger.prototype.EOMCheckFinalVictory = function()
{
	if (this.eom.victoryAwarded || this.eom.wave < this.eom.maxWave)
		return;

	this.eom.victoryAwarded = true;

	for (let player of this.eom.survivorPlayers)
		QueryPlayerIDInterface(player).SetState("won", "You survived the Gohma waves.");

	QueryPlayerIDInterface(this.eom.enemyPlayer).SetState("defeated", "The Gohma swarm has been defeated.");
};

Trigger.prototype.EOMOrderAttack = function(entities, queued)
{
	let targets = this.EOMGetAttackTargets();
	if (!targets.length)
		return;

	let groups = [];
	for (let i = 0; i < targets.length; ++i)
		groups.push([]);

	for (let i = 0; i < entities.length; ++i)
		groups[i % groups.length].push(entities[i]);

	for (let i = 0; i < groups.length; ++i)
		if (groups[i].length)
			this.EOMAttackCommand(targets[i].x, targets[i].z, groups[i], queued);
};

Trigger.prototype.EOMGetAttackTargets = function()
{
	let targets = [];

	for (let player of this.eom.survivorPlayers)
	{
		let structures = this.EOMFilterLiveEntities(TriggerHelper.GetPlayerEntitiesByClass(player, "Structure"));
		if (structures.length)
		{
			let ent = structures[randIntInclusive(0, structures.length - 1)];
			let cmpPosition = Engine.QueryInterface(ent, IID_Position);
			if (cmpPosition && cmpPosition.IsInWorld())
			{
				let pos = cmpPosition.GetPosition2D();
				targets.push({ "x": pos.x, "z": pos.y });
			}
		}
	}

	return targets.length ? targets : this.eom.fallbackTargets.slice();
};

Trigger.prototype.EOMFilterLiveEntities = function(entities)
{
	let live = [];

	for (let ent of entities)
	{
		let cmpHealth = Engine.QueryInterface(ent, IID_Health);
		let cmpPosition = Engine.QueryInterface(ent, IID_Position);
		if (cmpHealth && cmpPosition && cmpPosition.IsInWorld())
			live.push(ent);
	}

	return live;
};

Trigger.prototype.EOMAttackCommand = function(x, z, entities, queued)
{
	ProcessCommand(this.eom.enemyPlayer, {
		"type": "attack-walk",
		"x": x,
		"z": z,
		"entities": entities,
		"targetClasses": { "attack": ["Unit", "Structure"] },
		"allowCapture": false,
		"queued": queued
	});
};

Trigger.prototype.EOMSetAIStance = function(name, entities)
{
	ProcessCommand(this.eom.enemyPlayer, {
		"type": "stance",
		"entities": entities,
		"name": name
	});
};
