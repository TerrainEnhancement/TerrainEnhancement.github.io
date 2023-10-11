#version 300 es
precision highp float;

// INPUT -----------------------------
in vec2 uv;

// OUTPUT -----------------------------

layout(location=0) out float out_fBm;
layout(location=1) out float out_displa;


// UNIFORM -----------------------------
uniform bool iBoolAugmentation;
uniform bool iBoolAmplitude;

uniform float iParamFrequence;
uniform float iParamAmplitude;

uniform sampler2D iTerrainInput;
uniform sampler2D iRiver;


// ---- Tools -------------------------------------
vec2 hash( vec2 p )
{
    p = vec2( dot(p,vec2(127.1,311.7)),
    dot(p,vec2(269.5,183.3)) );

    return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}


float noise( in vec2 p )
{
    const float K1 = 0.366025404; // (sqrt(3)-1)/2;
    const float K2 = 0.211324865; // (3-sqrt(3))/6;

    vec2 i = floor( p + (p.x+p.y)*K1 );

    vec2 a = p - i + (i.x+i.y)*K2;
    vec2 o = step(a.yx,a.xy);
    vec2 b = a - o + K2;
    vec2 c = a - 1.0 + 2.0*K2;

    vec3 h = max( 0.5-vec3(dot(a,a), dot(b,b), dot(c,c) ), 0.0 );

    vec3 n = h*h*h*h*vec3( dot(a,hash(i+0.0)), dot(b,hash(i+o)), dot(c,hash(i+1.0)));

    return dot( n, vec3(70.0) );
}


float fBm(vec2 uv, int numOctaves, float frequence )
{   
    float fbm_noise = 0.;

    float G = 0.5;
    float ampl = 1.;
    float freq = frequence;//24.;

    for( int i=0; i<numOctaves; i++ )
    {
        fbm_noise += ampl*noise(freq*uv);
        freq *= 2.0;
        ampl *= G;
    }
    return fbm_noise;
}


// ---- Transfer map -------------------------------------
float riged(float val)
{
    return abs(val);
}


// ---- Control maps -------------------------------------
float amplitude_map(float facteur, vec2 uv, sampler2D champ)
{
    float height = texture(champ, uv).x;
    return facteur*height;
}


// MAIN PROGRAM -----------------------------
void main()
{
    // noise parameters
    float frequence = iParamFrequence;
    float amplitude = iParamAmplitude;

    // storing for fbo output
    float disp_supp = 0.0;
    float tmp_fBm = 0.0;

    // comput details (if display)
    if(iBoolAugmentation)
    {
        if(iBoolAmplitude)
        {
            amplitude = amplitude_map(iParamAmplitude, uv, iRiver);
        }

        tmp_fBm = amplitude * fBm(uv, 6, frequence);
        disp_supp += tmp_fBm;

    }

    out_fBm = tmp_fBm;       // out location = 0
    out_displa = texture(iTerrainInput, uv).x + disp_supp;  // out location = 1
}