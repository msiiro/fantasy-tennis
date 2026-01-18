"""
Fallback data if scraping fails
You can manually update this with current rankings
"""

def get_fallback_rankings():
    """Return hardcoded current rankings as fallback"""
    return [
        # ATP Top 20 (update these manually from atptour.com)
        {'name': 'Jannik Sinner', 'rank': 1, 'points': 11830, 'country': 'ITA', 'tour': 'ATP'},
        {'name': 'Alexander Zverev', 'rank': 2, 'points': 8135, 'country': 'GER', 'tour': 'ATP'},
        {'name': 'Carlos Alcaraz', 'rank': 3, 'points': 7010, 'country': 'ESP', 'tour': 'ATP'},
        {'name': 'Taylor Fritz', 'rank': 4, 'points': 5100, 'country': 'USA', 'tour': 'ATP'},
        {'name': 'Daniil Medvedev', 'rank': 5, 'points': 4830, 'country': 'RUS', 'tour': 'ATP'},
        {'name': 'Casper Ruud', 'rank': 6, 'points': 4255, 'country': 'NOR', 'tour': 'ATP'},
        {'name': 'Novak Djokovic', 'rank': 7, 'points': 3900, 'country': 'SRB', 'tour': 'ATP'},
        {'name': 'Alex de Minaur', 'rank': 8, 'points': 3745, 'country': 'AUS', 'tour': 'ATP'},
        {'name': 'Andrey Rublev', 'rank': 9, 'points': 3720, 'country': 'RUS', 'tour': 'ATP'},
        {'name': 'Grigor Dimitrov', 'rank': 10, 'points': 3340, 'country': 'BUL', 'tour': 'ATP'},
        
        # WTA Top 20
        {'name': 'Aryna Sabalenka', 'rank': 1, 'points': 9706, 'country': 'BLR', 'tour': 'WTA'},
        {'name': 'Iga Swiatek', 'rank': 2, 'points': 8370, 'country': 'POL', 'tour': 'WTA'},
        {'name': 'Coco Gauff', 'rank': 3, 'points': 6530, 'country': 'USA', 'tour': 'WTA'},
        {'name': 'Jasmine Paolini', 'rank': 4, 'points': 5344, 'country': 'ITA', 'tour': 'WTA'},
        {'name': 'Zheng Qinwen', 'rank': 5, 'points': 5340, 'country': 'CHN', 'tour': 'WTA'},
        {'name': 'Elena Rybakina', 'rank': 6, 'points': 5171, 'country': 'KAZ', 'tour': 'WTA'},
        {'name': 'Jessica Pegula', 'rank': 7, 'points': 4705, 'country': 'USA', 'tour': 'WTA'},
        {'name': 'Emma Navarro', 'rank': 8, 'points': 3698, 'country': 'USA', 'tour': 'WTA'},
        {'name': 'Daria Kasatkina', 'rank': 9, 'points': 3368, 'country': 'RUS', 'tour': 'WTA'},
        {'name': 'Barbora Krejcikova', 'rank': 10, 'points': 3214, 'country': 'CZE', 'tour': 'WTA'},
    ]