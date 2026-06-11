function RandomIntervalSpawner() {}

RandomIntervalSpawner.prototype.Schema =
	"<a:help>Spawns one random entity at a regular interval, using weighted template choices.</a:help>" +
	"<element name='Interval' a:help='Time between spawns, in milliseconds.'>" +
		"<ref name='positiveDecimal'/>" +
	"</element>" +
	"<optional>" +
		"<element name='SpawnOffset' a:help='Optional local X/Z offset used as the initial spawn position.'>" +
			"<interleave>" +
				"<element name='X'><data type='decimal'/></element>" +
				"<element name='Z'><data type='decimal'/></element>" +
			"</interleave>" +
		"</element>" +
	"</optional>" +
	"<optional>" +
		"<element name='DestinationOffset' a:help='Optional list of local X/Z points the spawned unit walks to before becoming solid again.'>" +
			"<oneOrMore>" +
				"<element>" +
					"<anyName/>" +
					"<interleave>" +
						"<element name='X'><data type='decimal'/></element>" +
						"<element name='Z'><data type='decimal'/></element>" +
					"</interleave>" +
				"</element>" +
			"</oneOrMore>" +
		"</element>" +
	"</optional>" +
	"<optional>" +
		"<element name='LineupOffset' a:help='Optional local X/Z spacing applied to the final destination of successive spawned units.'>" +
			"<interleave>" +
				"<element name='X'><data type='decimal'/></element>" +
				"<element name='Z'><data type='decimal'/></element>" +
				"<optional>" +
					"<element name='MaxThresholdOffset' a:help='Additional local offset applied each time Threshold spawned units have been lined up.'>" +
						"<interleave>" +
							"<element name='Threshold'><data type='positiveInteger'/></element>" +
							"<element name='X'><data type='decimal'/></element>" +
							"<element name='Z'><data type='decimal'/></element>" +
						"</interleave>" +
					"</element>" +
				"</optional>" +
			"</interleave>" +
		"</element>" +
	"</optional>" +
	"<element name='Entities' a:help='Weighted list of entity templates that can be spawned.'>" +
		"<oneOrMore>" +
			"<element a:help='One weighted spawn entry. The element name is only an identifier and must be unique.'>" +
				"<anyName/>" +
				"<interleave>" +
					"<element name='Template' a:help='Entity template to spawn. {civ} is replaced by the owner civilization.'>" +
						"<text/>" +
					"</element>" +
					"<element name='Weight' a:help='Relative random weight. Entries with weight 0 are ignored.'>" +
						"<ref name='nonNegativeDecimal'/>" +
					"</element>" +
				"</interleave>" +
			"</element>" +
		"</oneOrMore>" +
	"</element>";

RandomIntervalSpawner.prototype.Init = function()
{
	this.timer = undefined;
	this.moveData = {};
	this.nextMoveId = 1;
	this.lineupIndex = 0;

	if (Engine.QueryInterface(this.entity, IID_Foundation))
		return;

	this.StartTimer();
};

RandomIntervalSpawner.prototype.Serialize = null;

RandomIntervalSpawner.prototype.StartTimer = function()
{
	if (this.timer)
		return;

	const interval = ApplyValueModificationsToEntity(
		"RandomIntervalSpawner/Interval",
		+this.template.Interval,
		this.entity);
	if (interval <= 0)
		return;

	this.timer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer).SetInterval(
		this.entity,
		IID_RandomIntervalSpawner,
		"Spawn",
		interval,
		interval,
		null);
};

RandomIntervalSpawner.prototype.Spawn = function()
{
	if (!this.CanSpawn())
		return;

	const templateName = this.PickTemplate();
	if (!templateName)
		return;

	const spawnedEntity = Engine.AddEntity(this.ResolveTemplateName(templateName));
	if (!spawnedEntity || spawnedEntity == INVALID_ENTITY)
		return;

	this.PlaceSpawnedEntity(spawnedEntity);
	this.SetSpawnedOwner(spawnedEntity);
	this.SetupSpawnedEntity(spawnedEntity);
	this.MoveSpawnedEntityOut(spawnedEntity);
};

RandomIntervalSpawner.prototype.CanSpawn = function()
{
	const cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	return cmpPosition && cmpPosition.IsInWorld();
};

RandomIntervalSpawner.prototype.PickTemplate = function()
{
	const entities = this.GetWeightedEntities();
	if (!entities.length)
		return undefined;

	let totalWeight = 0;
	for (const entry of entities)
		totalWeight += entry.weight;

	let roll = randFloat(0, totalWeight);
	for (const entry of entities)
	{
		roll -= entry.weight;
		if (roll <= 0)
			return entry.template;
	}

	return entities[entities.length - 1].template;
};

RandomIntervalSpawner.prototype.GetWeightedEntities = function()
{
	const entities = this.template.Entities;
	if (!entities)
		return [];

	const result = [];
	for (const key in entities)
	{
		const entry = entities[key];
		const weight = ApplyValueModificationsToEntity(
			"RandomIntervalSpawner/Entities/" + key + "/Weight",
			+entry.Weight,
			this.entity);
		if (!entry.Template || weight <= 0)
			continue;

		result.push({
			"template": entry.Template,
			"weight": weight
		});
	}
	return result;
};

RandomIntervalSpawner.prototype.ResolveTemplateName = function(templateName)
{
	if (templateName.indexOf("{civ}") == -1)
		return templateName;

	const cmpIdentity = QueryOwnerInterface(this.entity, IID_Identity);
	const civ = cmpIdentity && cmpIdentity.GetCiv && cmpIdentity.GetCiv();
	return templateName.replace(/\{civ\}/g, civ || "");
};

RandomIntervalSpawner.prototype.PlaceSpawnedEntity = function(spawnedEntity)
{
	const cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	const cmpSpawnedPosition = Engine.QueryInterface(spawnedEntity, IID_Position);
	if (!cmpPosition || !cmpPosition.IsInWorld() || !cmpSpawnedPosition)
		return;

	const pos = this.GetSpawnPosition(spawnedEntity);

	const z = pos.z !== undefined ? pos.z : pos.y;
	cmpSpawnedPosition.JumpTo(pos.x, z);

	const rot = cmpPosition.GetRotation();
	cmpSpawnedPosition.SetYRotation(rot.y);
	cmpSpawnedPosition.SetXZRotation(rot.x, rot.z);
};

RandomIntervalSpawner.prototype.GetSpawnPosition = function(spawnedEntity)
{
	const cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	const buildingPos = cmpPosition.GetPosition2D();
	const rot = cmpPosition.GetRotation();

	if (this.template.SpawnOffset)
	{
		const offset = new Vector2D(+this.template.SpawnOffset.X, +this.template.SpawnOffset.Z);
		offset.rotate(rot.y);
		return {
			"x": buildingPos.x + offset.x,
			"z": buildingPos.y + offset.y
		};
	}

	const cmpFootprint = Engine.QueryInterface(this.entity, IID_Footprint);
	if (cmpFootprint && cmpFootprint.PickSpawnPoint)
		return cmpFootprint.PickSpawnPoint(spawnedEntity);

	return {
		"x": buildingPos.x,
		"z": buildingPos.y
	};
};

RandomIntervalSpawner.prototype.SetSpawnedOwner = function(spawnedEntity)
{
	const cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
	const cmpSpawnedOwnership = Engine.QueryInterface(spawnedEntity, IID_Ownership);
	if (cmpOwnership && cmpSpawnedOwnership)
		cmpSpawnedOwnership.SetOwner(cmpOwnership.GetOwner());
};

RandomIntervalSpawner.prototype.SetupSpawnedEntity = function(spawnedEntity)
{
	const cmpHealth = Engine.QueryInterface(spawnedEntity, IID_Health);
	if (cmpHealth)
		cmpHealth.freeUnit = true;

	const cmpPromotion = Engine.QueryInterface(spawnedEntity, IID_Promotion);
	if (cmpPromotion && cmpPromotion.GetRequiredXp && cmpPromotion.GetRequiredXp() < 1)
		cmpPromotion.IncreaseXp(+0);

	const cmpBattalion = Engine.QueryInterface(spawnedEntity, IID_Battalion);
	const cmpPlayer = QueryOwnerInterface(spawnedEntity);
	if (cmpBattalion && cmpPlayer && cmpPlayer.AddBattalion)
		cmpPlayer.AddBattalion([spawnedEntity]);

	const cmpVisual = Engine.QueryInterface(spawnedEntity, IID_Visual);
	if (cmpVisual)
		cmpVisual.SelectAnimation("spawn", true, 1.0);

	PlaySound("spawn", spawnedEntity);
};

RandomIntervalSpawner.prototype.MoveSpawnedEntityOut = function(spawnedEntity)
{
	const cmpUnitAI = Engine.QueryInterface(spawnedEntity, IID_UnitAI);
	if (!cmpUnitAI || !cmpUnitAI.Walk)
		return;

	const destinationPoints = this.GetDestinationPoints(spawnedEntity, this.lineupIndex++);
	if (!destinationPoints.length)
		return;

	const cmpObstruction = Engine.QueryInterface(spawnedEntity, IID_Obstruction);
	if (cmpObstruction)
		cmpObstruction.SetActive(false);

	const defaultStance = cmpUnitAI.GetStanceName ? cmpUnitAI.GetStanceName() : undefined;
	if (cmpUnitAI.SwitchToStance)
		cmpUnitAI.SwitchToStance("none");

	const cmpIdentity = Engine.QueryInterface(spawnedEntity, IID_Identity);
	if (cmpIdentity)
		cmpIdentity.controllable = false;

	cmpUnitAI.Walk(destinationPoints[0].x, destinationPoints[0].y, false);
	for (let i = 1; i < destinationPoints.length; ++i)
		cmpUnitAI.Walk(destinationPoints[i].x, destinationPoints[i].y, true);

	const id = this.nextMoveId++;
	this.moveData[id] = {
		"entity": spawnedEntity,
		"defaultStance": defaultStance
	};

	Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer).SetTimeout(
		this.entity,
		IID_RandomIntervalSpawner,
		"FinishMoveOut",
		200,
		id);
};

RandomIntervalSpawner.prototype.GetDestinationPoints = function(spawnedEntity, lineupIndex)
{
	const cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	if (!cmpPosition || !cmpPosition.IsInWorld())
		return [];

	const buildingPos = cmpPosition.GetPosition();
	const rot = cmpPosition.GetRotation();
	const points = [];

	if (this.template.DestinationOffset)
	{
		for (const key in this.template.DestinationOffset)
		{
			const offset = new Vector2D(+this.template.DestinationOffset[key].X, +this.template.DestinationOffset[key].Z);
			offset.rotate(rot.y);
			points.push(new Vector2D(buildingPos.x + offset.x, buildingPos.z + offset.y));
		}
		this.ApplyLineupOffset(points, lineupIndex, rot.y);
		return points;
	}

	const cmpFootprint = Engine.QueryInterface(this.entity, IID_Footprint);
	if (cmpFootprint && cmpFootprint.PickSpawnPoint)
		points.push(Vector2D.from3D(cmpFootprint.PickSpawnPoint(spawnedEntity)));

	this.ApplyLineupOffset(points, lineupIndex, rot.y);
	return points;
};

RandomIntervalSpawner.prototype.ApplyLineupOffset = function(points, lineupIndex, rotation)
{
	if (!points.length || !this.template.LineupOffset)
		return;

	let lineupOffset = new Vector2D(+this.template.LineupOffset.X, +this.template.LineupOffset.Z);
	lineupOffset.rotate(rotation);

	let threshold = Infinity;
	let thresholdOffset = new Vector2D(0, 0);
	if (this.template.LineupOffset.MaxThresholdOffset)
	{
		threshold = +this.template.LineupOffset.MaxThresholdOffset.Threshold;
		thresholdOffset = new Vector2D(
			+this.template.LineupOffset.MaxThresholdOffset.X,
			+this.template.LineupOffset.MaxThresholdOffset.Z);
		thresholdOffset.rotate(rotation);
	}

	const thresholdCount = isFinite(threshold) ? Math.floor(lineupIndex / threshold) : 0;
	const indexInLine = isFinite(threshold) ? lineupIndex % threshold : lineupIndex;
	const last = points[points.length - 1];
	points[points.length - 1] = new Vector2D(
		last.x + indexInLine * lineupOffset.x + thresholdCount * thresholdOffset.x,
		last.y + indexInLine * lineupOffset.y + thresholdCount * thresholdOffset.y);
};

RandomIntervalSpawner.prototype.FinishMoveOut = function(id)
{
	const data = this.moveData[id];
	if (!data)
		return;

	const cmpUnitAI = Engine.QueryInterface(data.entity, IID_UnitAI);
	if (cmpUnitAI && !cmpUnitAI.IsIdle())
	{
		Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer).SetTimeout(
			this.entity,
			IID_RandomIntervalSpawner,
			"FinishMoveOut",
			200,
			id);
		return;
	}

	if (cmpUnitAI && data.defaultStance && cmpUnitAI.SwitchToStance)
		cmpUnitAI.SwitchToStance(data.defaultStance);

	const cmpObstruction = Engine.QueryInterface(data.entity, IID_Obstruction);
	if (cmpObstruction)
		cmpObstruction.SetActive(true);

	const cmpIdentity = Engine.QueryInterface(data.entity, IID_Identity);
	if (cmpIdentity)
		cmpIdentity.controllable = true;

	delete this.moveData[id];
};

Engine.RegisterComponentType(IID_RandomIntervalSpawner, "RandomIntervalSpawner", RandomIntervalSpawner);
