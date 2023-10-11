# Terrain enhancement WebGL demo

WebGL demo for the article "Real-time terrain enhancement with controlled procedural patterns".

Authors: 
- Charline Grenier
- Éric Guérin
- Éric Galin
- Basile Sauvage


## augmented_terrain
Implementation of a parallel version of our terrain amplification method on graphics hardware. 
The different features and parameters (such as signal frequencies and amplitudes) can be triggered or disabled using toggle buttons.


## augmented_terrain_large
It is the same implementation as the previous one, but the procedural details are computer 20 times in a row at each update.
On WebGL implementation, runtime on rendering faster than 60fps can't be measured precisely.
Here, the objective is to measure significant runtime to compare with a simple fBm enhancement method.


## fbm_terrain_large
Terrain enhancement using simple fBm noise.
As previously, procedural details are computed 20 times in a row at each update to measure significant runtimes.
