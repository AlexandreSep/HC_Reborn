export function postTrain(player, facility, template, count)
{
	Engine.PostCommand(player, {
		"type": "train",
		"entities": [facility.id()],
		"template": template,
		"count": count || 1
	});
}

export function postResearch(player, researcher, template)
{
	Engine.PostCommand(player, {
		"type": "research",
		"entity": researcher.id(),
		"template": template,
		"pushFront": false
	});
}

export function postChooseHero(player, civ)
{
	Engine.PostCommand(player, {
		"type": "ChooseHero",
		"civ": civ
	});
}

export function postUpgrade(player, entity, template)
{
	Engine.PostCommand(player, {
		"type": "upgrade",
		"entities": [entity.id()],
		"template": template
	});
}

export function postGather(player, unit, target)
{
	Engine.PostCommand(player, {
		"type": "gather",
		"entities": [unit.id()],
		"target": target.id(),
		"queued": false,
		"pushFront": false
	});
}

export function postConstruct(player, builder, template, position, angle)
{
	Engine.PostCommand(player, {
		"type": "construct",
		"entities": [builder.id()],
		"template": template,
		"x": position.x,
		"z": position.z,
		"angle": angle,
		"autorepair": true,
		"autocontinue": true,
		"queued": false,
		"pushFront": true
	});
}

export function postWalk(player, entities, position)
{
	Engine.PostCommand(player, {
		"type": "walk",
		"entities": entities,
		"x": position[0],
		"z": position[1],
		"queued": false,
		"pushFront": false
	});
}

export function postAttackWalk(player, entities, position, allowCapture)
{
	Engine.PostCommand(player, {
		"type": "attack-walk",
		"entities": entities,
		"x": position[0],
		"z": position[1],
		"targetClasses": { "attack": ["Unit", "Structure"] },
		"allowCapture": allowCapture,
		"queued": false,
		"pushFront": false
	});
}
