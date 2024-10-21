// HC-Code: This is the exact same function as in tooltip.js.
// If this file and function does not exist we get an error "getTreasureTooltip is missing" 
/**
 * @param {Object} template - The entity's template.
 * @return {string} - The resources this entity rewards to a collecter.
 */
function getTreasureTooltip(template)
{
	if (!template.treasure)
		return "";

	let resources = {};
	for (let resource of g_ResourceData.GetResources())
	{
		let type = resource.code;
		if (template.treasure.resources[type])
			resources[type] = template.treasure.resources[type];
	}

	let resourceNames = Object.keys(resources);
	if (!resourceNames.length)
		return "";

	return sprintf(translate("%(label)s %(details)s"), {
		"label": headerFont(translate("Reward:")),
		"details":
			resourceNames.map(
				type => sprintf(translate("%(resourceIcon)s %(reward)s"), {
					"resourceIcon": resourceIcon(type),
					"reward": resources[type]
				})
			).join("  ")
	});
}
