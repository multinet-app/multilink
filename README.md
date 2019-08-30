Amazon Turk Study for Multivariate Network Visualization Techniques 

===================


Data
---
The raw data from our experiments are stored in the [data](data) folder.

Analysis
---
The R Markdown files we used to compute statistics are in the [analysis](analysis) folder.

Experiment
---
The code for reproducing our web-based experiment is in the [experiments](experiments) folder.


# Config Files
Config files determine how the visualization is rendered along with the task that is used in that trial. 

Config files are written in .hjson to allow for comments, so if you're updating an existing config or generating a new one, follow these steps to ensure you end up with a .json file that javascript can parse out: 

-- to install the tool that converts between .hjson and .json (on a mac)
GET=https://github.com/hjson/hjson-go/releases/download/v3.0.0/darwin_amd64.tar.gz
curl -sSL $GET | sudo tar -xz -C /usr/local/bin



-- to generate a .json from an .hjson 
hjson CONFIG.json > CONFIG.hjson


-- to generate an .hjson from a .json
hjson -j CONFIG.hjson > CONFIG.json
