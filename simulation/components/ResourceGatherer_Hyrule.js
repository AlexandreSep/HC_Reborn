ResourceGatherer.prototype.ConvertResourcesHyrule = function ()
{
	// Convert all resources 1:1
	let resourceToConvertTo = this.template.ConvertAllResourcesOnDeposit;
	if (resourceToConvertTo)
	{
		for (let resource in this.carrying)
		{
			if (resource != resourceToConvertTo)
			{
				this.carrying[resourceToConvertTo] = this.carrying[resource];
				this.carrying[resource] = 0;
			}
		}
	}

	// Convert resources on an individual basis
	let resourcesToConvert = this.template.ConvertOnDeposit;
	if (!resourcesToConvert)
		return;

	for (let resourceCarrying in this.carrying)
	{
		for (let resourceToConvert in resourcesToConvert)
		{
			if (resourceCarrying != resourceToConvert)
			{
				continue;
			}
			let resourceToConvertTo = resourcesToConvert[resourceToConvert].ConvertTo;
			let ratio = resourcesToConvert[resourceToConvert].Ratio;
			if (resourceCarrying != resourceToConvertTo)
			{
				this.carrying[resourceToConvertTo] = (this.carrying[resourceCarrying] * ratio);
				this.carrying[resourceCarrying] = 0;
			}
		}
	}
}
