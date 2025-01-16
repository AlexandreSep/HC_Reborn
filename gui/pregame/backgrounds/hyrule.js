g_NewBackgroundLayerData.push(
	[
		{
			"offset": (time, width) => 0,
			"sprite": "background-hyrule-1",
			"tiling": true,
		},
		{
			"offset": (time, width) => 0.08 * width * Math.cos(0.04 * time),
			"sprite": "background-hyrule-2",
			"tiling": true,
		},	
		{
			"offset": (time, width) => 0.12 * width * Math.cos(0.04 * time),
			"sprite": "background-hyrule-3",
			"tiling": true,
		},	
		{
			"offset": (time, width) => 0,
			"sprite": "background-hyrule-4",
			"tiling": true,
		},			
	]);
