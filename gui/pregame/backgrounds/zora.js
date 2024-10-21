g_BackgroundLayerData.push(
	[
		{
			"offset": (time, width) => 0.07 * width * Math.cos(0.05 * time),
			"sprite": "background-zora-1",
			"tiling": false,
		},
		
		{
			"offset": (time, width) => -0.03 * width * Math.cos(0.05 * time),
			"sprite": "background-zora-2",
			"tiling": false,
		},
		
		{
			"offset": (time, width) => -0.12 * width * Math.cos(0.05 * time),
			"sprite": "background-zora-3",
			"tiling": false,
		},
		{
			"offset": (time, width) => -0.07 * width * Math.cos(0.05 * time),
			"sprite": "background-zora-4",
			"tiling": false,
		},	
		{
			"offset": (time, width) => -0.32 * width * Math.cos(0.05 * time),
			"sprite": "background-zora-5",
			"tiling": false,
		},	
	]);
