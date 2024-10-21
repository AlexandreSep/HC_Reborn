g_BackgroundLayerData.push(
	[
		{
			"offset": (time, width) => -0.12 * width * Math.cos(0.05 * time),
			"sprite": "background-gohma-1",
			"tiling": true,
		},
		
		{
			"offset": (time, width) => 0.11 * width * Math.cos(0.05 * time),
			"sprite": "background-gohma-4",
			"tiling": false,
		},	
		
		{
			"offset": (time, width) => -0.11 * width * Math.cos(0.05 * time),
			"sprite": "background-gohma-2",
			"tiling": false,
		},
		
		{
			"offset": (time, width) => -0.08 * width * Math.cos(0.05 * time),
			"sprite": "background-gohma-3",
			"tiling": false,
		},

		{
			"offset": (time, width) => 0.22 * width * Math.cos(0.05 * time),
			"sprite": "background-gohma-5",
			"tiling": false,
		},	
	]);
