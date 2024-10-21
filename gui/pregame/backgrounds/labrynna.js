g_BackgroundLayerData.push(
	[
		{
			"offset": (time, width) => 0.05 * width * Math.cos(0.05 * time),
			"sprite": "background-labrynna-1",
			"tiling": false,
		},
		
		{
			"offset": (time, width) => 0.09 * width * Math.cos(0.05 * time),
			"sprite": "background-labrynna-2",
			"tiling": false,
		},
		
		{
			"offset": (time, width) => -0.10 * width * Math.cos(0.05 * time),
			"sprite": "background-labrynna-3",
			"tiling": false,
		},
		{
			"offset": (time, width) => -0.05 * width * Math.cos(0.05 * time),
			"sprite": "background-labrynna-4",
			"tiling": false,
		},	
	]);
